import { useState, useEffect, useRef } from "react";
import styles from "./Control.module.scss";

interface ImageData {
  id: string;
  image: HTMLImageElement;
  jsCanvas: HTMLCanvasElement | null;
  wasmCanvas: HTMLCanvasElement | null;
  jsTime: number;
  wasmTime: number;
}

const Control = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [hue, setHue] = useState(0); // 0-360
  const [saturation, setSaturation] = useState(100); // 0-200
  const [value, setValue] = useState(100); // 0-200
  // 디바운싱된 값 (실제 이미지 처리에 사용)
  const [debouncedHue, setDebouncedHue] = useState(0);
  const [debouncedSaturation, setDebouncedSaturation] = useState(100);
  const [debouncedValue, setDebouncedValue] = useState(100);
  const [imageCount, setImageCount] = useState(1);
  const [wasmModule, setWasmModule] = useState<any>(null);
  const [totalJsTime, setTotalJsTime] = useState(0);
  const [totalWasmTime, setTotalWasmTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jsCompleted, setJsCompleted] = useState(false);
  const [wasmCompleted, setWasmCompleted] = useState(false);
  const [winner, setWinner] = useState<"js" | "wasm" | null>(null);
  const cancelTokenRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const imagesRef = useRef<ImageData[]>([]);

  // WASM 모듈 로드
  useEffect(() => {
    const loadWasm = async () => {
      try {
        // @ts-ignore - WASM 모듈 동적 import
        const createModule = await import("../../wasm/hsv.js");
        const module = await createModule.default();
        setWasmModule(module);
        console.log("WASM 모듈 로드 완료");
      } catch (error) {
        console.error("WASM 로드 실패:", error);
      }
    };
    loadWasm();
  }, []);

  // 이미지 로드
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: ImageData[] = [];
    let loadedCount = 0;

    files.slice(0, imageCount).forEach((file, index) => {
      const img = new Image();
      img.onload = () => {
        const imageData: ImageData = {
          id: `img-${Date.now()}-${index}`,
          image: img,
          jsCanvas: null,
          wasmCanvas: null,
          jsTime: 0,
          wasmTime: 0,
        };
        newImages.push(imageData);
        loadedCount++;

        if (loadedCount === Math.min(files.length, imageCount)) {
          imagesRef.current = newImages;
          setImages(newImages);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // 디바운싱: 슬라이더 값이 변경되면 즉시 실제 처리 값 업데이트
  useEffect(() => {
    setDebouncedHue(hue);
    setDebouncedSaturation(saturation);
    setDebouncedValue(value);
  }, [hue, saturation, value]);

  // 이미지가 새로 로드되면 초기 렌더링 트리거
  useEffect(() => {
    if (images.length > 0 && wasmModule) {
      // 약간의 딜레이를 주고 현재 HSV 값으로 강제 처리 트리거
      const timer = setTimeout(() => {
        // debounced 값을 강제로 다시 설정해서 처리 useEffect 트리거
        const currentHue = hue;
        const currentSat = saturation;
        const currentVal = value;
        setDebouncedHue(currentHue);
        setDebouncedSaturation(currentSat);
        setDebouncedValue(currentVal);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [images.length, wasmModule, hue, saturation, value]);

  // 디바운싱된 값으로 이미지 처리 (실시간 반영 및 동시 처리)
  useEffect(() => {
    const currentImages = imagesRef.current;
    if (currentImages.length === 0 || !wasmModule) return;

    // canvas가 모두 설정되었는지 확인
    const allCanvasesReady = currentImages.every(
      (imgData) => imgData.jsCanvas && imgData.wasmCanvas
    );

    if (!allCanvasesReady) return;

    // 이전 처리 취소
    cancelTokenRef.current.cancelled = true;
    const currentToken = { cancelled: false };
    cancelTokenRef.current = currentToken;

    setIsProcessing(true);
    setJsCompleted(false);
    setWasmCompleted(false);
    setWinner(null);
    setTotalJsTime(0);
    setTotalWasmTime(0);

    // JS와 WASM을 병렬로 처리 (MessageChannel로 동시 시작)
    if (currentToken.cancelled) return;

    let jsTotal = 0;
    let wasmTotal = 0;
    let jsDone = false;
    let wasmDone = false;

    const checkBothDone = () => {
      if (jsDone && wasmDone && !currentToken.cancelled) {
        setWinner(wasmTotal < jsTotal ? "wasm" : "js");
        setIsProcessing(false);
      }
    };

    // 동시 시작을 위한 채널 생성
    const channel = new MessageChannel();
    const port1 = channel.port1;
    const port2 = channel.port2;

    // JS 처리
    port1.onmessage = () => {
      if (currentToken.cancelled) return;
      const jsStart = performance.now();
      currentImages.forEach((imgData) => {
        if (currentToken.cancelled) return;
        const start = performance.now();
        processWithJS(
          imgData,
          debouncedHue,
          debouncedSaturation,
          debouncedValue
        );
        const end = performance.now();
        imgData.jsTime = end - start;
      });
      const jsEnd = performance.now();
      jsTotal = jsEnd - jsStart;
      setTotalJsTime(jsTotal);
      setJsCompleted(true);
      jsDone = true;
      setImages([...currentImages]);
      checkBothDone();
    };

    // WASM 처리
    port2.onmessage = () => {
      if (currentToken.cancelled) return;
      const wasmStart = performance.now();
      currentImages.forEach((imgData) => {
        if (currentToken.cancelled) return;
        const start = performance.now();
        processWithWasm(
          imgData,
          debouncedHue,
          debouncedSaturation,
          debouncedValue
        );
        const end = performance.now();
        imgData.wasmTime = end - start;
      });
      const wasmEnd = performance.now();
      wasmTotal = wasmEnd - wasmStart;
      setTotalWasmTime(wasmTotal);
      setWasmCompleted(true);
      wasmDone = true;
      setImages([...currentImages]);
      checkBothDone();
    };

    // 동시에 시작 신호 전송
    port1.postMessage("start");
    port2.postMessage("start");
  }, [debouncedHue, debouncedSaturation, debouncedValue, wasmModule]);

  // JS로 HSV 조정
  const processWithJS = (
    imgData: ImageData,
    hueValue: number,
    satValue: number,
    valValue: number
  ) => {
    const canvas = imgData.jsCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgData.image;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // RGB to HSV (index.html과 동일한 방식 - 0-1 범위)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;

      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;

      if (d !== 0) {
        if (max === r) {
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
          h = ((b - r) / d + 2) / 6;
        } else {
          h = ((r - g) / d + 4) / 6;
        }
      }

      // HSV 조정 (index.html과 동일 - 곱하기 방식)
      const hueShift = hueValue / 360.0; // 0-360 -> 0-1
      const satScale = satValue / 100.0; // 0-200 -> 0-2
      const valScale = valValue / 100.0; // 0-200 -> 0-2

      const newH = (h + hueShift) % 1;
      const newS = Math.min(s * satScale, 1);
      const newV = Math.min(v * valScale, 1);

      // HSV to RGB (index.html과 동일한 방식)
      const c = newV * newS;
      const x = c * (1 - Math.abs(((newH * 6) % 2) - 1));
      const m = newV - c;

      let r1 = 0,
        g1 = 0,
        b1 = 0;
      if (newH < 1 / 6) {
        r1 = c;
        g1 = x;
        b1 = 0;
      } else if (newH < 2 / 6) {
        r1 = x;
        g1 = c;
        b1 = 0;
      } else if (newH < 3 / 6) {
        r1 = 0;
        g1 = c;
        b1 = x;
      } else if (newH < 4 / 6) {
        r1 = 0;
        g1 = x;
        b1 = c;
      } else if (newH < 5 / 6) {
        r1 = x;
        g1 = 0;
        b1 = c;
      } else {
        r1 = c;
        g1 = 0;
        b1 = x;
      }

      data[i] = Math.round((r1 + m) * 255);
      data[i + 1] = Math.round((g1 + m) * 255);
      data[i + 2] = Math.round((b1 + m) * 255);
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // WASM으로 HSV 조정
  const processWithWasm = (
    imgData: ImageData,
    hueValue: number,
    satValue: number,
    valValue: number
  ) => {
    if (!wasmModule) {
      // WASM이 없으면 JS로 처리 (임시)
      processWithJS(imgData, hueValue, satValue, valValue);
      return;
    }

    const canvas = imgData.wasmCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imgData.image;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    try {
      // WASM 메모리에 데이터 복사 (더 빠른 방법)
      const ptr = wasmModule._malloc(data.length);
      wasmModule.HEAPU8.set(data, ptr);

      // HSV 값 변환 (index.html과 동일 - 곱하기 방식)
      const hueShift = hueValue / 360.0; // 0-360 -> 0-1
      const satScale = satValue / 100.0; // 0-200 -> 0-2
      const valScale = valValue / 100.0; // 0-200 -> 0-2

      // applyHsvAdjustment 함수 호출 (메모리 포인터 직접 사용 - 더 빠름)
      wasmModule.applyHsvAdjustment(
        ptr,
        data.length,
        hueShift,
        satScale,
        valScale
      );

      // 결과를 다시 가져오기
      const result = wasmModule.HEAPU8.subarray(ptr, ptr + data.length);
      imageData.data.set(result);

      // 메모리 해제
      wasmModule._free(ptr);

      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error("WASM 처리 오류:", error);
      // 오류 발생 시 JS로 폴백
      processWithJS(imgData, hueValue, satValue, valValue);
    }
  };

  const setCanvasRef = (
    imgData: ImageData,
    type: "js" | "wasm",
    ref: HTMLCanvasElement | null
  ) => {
    if (type === "js") {
      imgData.jsCanvas = ref;
    } else {
      imgData.wasmCanvas = ref;
    }

    // 처음 canvas가 설정될 때만 원본 이미지 그리기
    if (ref && imgData.image) {
      const ctx = ref.getContext("2d");
      if (ctx && !ref.dataset.initialized) {
        ref.width = imgData.image.width;
        ref.height = imgData.image.height;
        ctx.drawImage(imgData.image, 0, 0);
        ref.dataset.initialized = "true";
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>동시 처리할 이미지 개수: {imageCount}</label>
          <input
            type="range"
            min="1"
            max="8"
            value={imageCount}
            onChange={(e) => {
              const count = Number(e.target.value);
              setImageCount(count);
              if (imagesRef.current.length > count) {
                const newImages = imagesRef.current.slice(0, count);
                imagesRef.current = newImages;
                setImages(newImages);
              }
            }}
          />
        </div>

        <div className={styles.controlGroup}>
          <label>이미지 업로드 (여러 개 선택 가능)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
          />
        </div>
      </div>

      <div className={styles.colorControlPanel}>
        <div className={styles.sliderGroup}>
          <div className={styles.slider}>
            <label>H: {hue}</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
            />
          </div>

          <div className={styles.slider}>
            <label>S: {saturation}</label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
            />
          </div>

          <div className={styles.slider}>
            <label>V: {value}</label>
            <input
              type="range"
              min="0"
              max="200"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <h3>전체 처리 시간 (총 {images.length}개 이미지)</h3>
              <div className={styles.timeComparison}>
                <div
                  className={`${styles.timeBox} ${
                    winner === "js" ? styles.winner : ""
                  } ${jsCompleted ? styles.completed : ""}`}
                >
                  <span className={styles.label}>
                    JavaScript
                    {jsCompleted && " ✓"}
                  </span>
                  <span className={styles.time}>
                    {isProcessing && !jsCompleted
                      ? "..."
                      : totalJsTime > 0
                      ? `${totalJsTime.toFixed(2)}ms`
                      : "-"}
                  </span>
                </div>
                <div
                  className={`${styles.timeBox} ${
                    winner === "wasm" ? styles.winner : ""
                  } ${wasmCompleted ? styles.completed : ""}`}
                >
                  <span className={styles.label}>
                    WebAssembly
                    {wasmCompleted && " ✓"}
                  </span>
                  <span className={styles.time}>
                    {isProcessing && !wasmCompleted
                      ? "..."
                      : totalWasmTime > 0
                      ? `${totalWasmTime.toFixed(2)}ms`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.imageGrid}>
            {images.map((imgData, index) => (
              <div key={imgData.id} className={styles.imageCard}>
                <h4>이미지 {index + 1}</h4>
                <div className={styles.comparison}>
                  <div
                    className={`${styles.result} ${
                      winner === "js" && jsCompleted ? styles.winnerResult : ""
                    } ${jsCompleted ? styles.completedResult : ""}`}
                  >
                    <h5>
                      JavaScript
                      {jsCompleted && " ✓"}
                    </h5>
                    <canvas
                      ref={(ref) => setCanvasRef(imgData, "js", ref)}
                      className={styles.canvas}
                    />
                    <p className={styles.timeText}>
                      {imgData.jsTime > 0
                        ? `${imgData.jsTime.toFixed(2)}ms`
                        : "-"}
                    </p>
                  </div>
                  <div
                    className={`${styles.result} ${
                      winner === "wasm" && wasmCompleted
                        ? styles.winnerResult
                        : ""
                    } ${wasmCompleted ? styles.completedResult : ""}`}
                  >
                    <h5>
                      WebAssembly
                      {wasmCompleted && " ✓"}
                    </h5>
                    <canvas
                      ref={(ref) => setCanvasRef(imgData, "wasm", ref)}
                      className={styles.canvas}
                    />
                    <p className={styles.timeText}>
                      {imgData.wasmTime > 0
                        ? `${imgData.wasmTime.toFixed(2)}ms`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Control;
