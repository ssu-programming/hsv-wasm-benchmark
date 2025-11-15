import createModule from "./hsv.js";

// ========================================
// DOM 요소
// ========================================
const canvasWasm = document.getElementById("canvasWasm");
const canvasJs = document.getElementById("canvasJs");
const ctxWasm = canvasWasm.getContext("2d");
const ctxJs = canvasJs.getContext("2d");

const imgInput = document.getElementById("imgInput");
const hueSlider = document.getElementById("hue");
const satSlider = document.getElementById("sat");
const valSlider = document.getElementById("val");
const timeWasmDisplay = document.getElementById("timeWasm");
const timeJsDisplay = document.getElementById("timeJs");
const winnerDisplay = document.getElementById("winner");
const wasmStatus = document.getElementById("wasmStatus");

// ========================================
// 상태
// ========================================
let originalData = null;
let wasmModule = null;
let updateScheduled = false; // 중복 업데이트 방직
let isProcessing = false; // 이미지 처리중?

// ========================================
// JavaScript HSV 함수들
// ========================================
function rgbToHsv(r, g, b) {
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

  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = v - c;

  let r1 = 0,
    g1 = 0,
    b1 = 0;

  if (h < 1 / 6) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h < 2 / 6) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h < 3 / 6) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h < 4 / 6) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h < 5 / 6) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: r1 + m,
    g: g1 + m,
    b: b1 + m,
  };
}

function applyHsvJs(data, hueShift, satScale, valScale) {
  for (let i = 0; i < data.length; i += 4) {
    // RGB 정규화 (0-1)
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    // RGB → HSV
    let { h, s, v } = rgbToHsv(r, g, b);

    // HSV 조정
    h = (h + hueShift) % 1;
    s = Math.min(s * satScale, 1);
    v = Math.min(v * valScale, 1);

    // HSV → RGB
    const rgb = hsvToRgb(h, s, v);

    // 0-255 범위로 변환
    data[i] = Math.round(rgb.r * 255);
    data[i + 1] = Math.round(rgb.g * 255);
    data[i + 2] = Math.round(rgb.b * 255);
  }
}

// ========================================
// 이미지 처리
// ========================================
function updateImage() {
  if (!originalData) {
    console.log("이미지를 먼저 업로드하세요");
    return;
  }

  // 이미 처리 중이면 스킵
  if (isProcessing) {
    console.log("이미 처리 중...");
    return;
  }

  isProcessing = true;
  winnerDisplay.textContent = "⏳ 처리 중...";
  winnerDisplay.className = "winner processing";

  // HSV 파라미터
  const hueShift = parseFloat(hueSlider.value) / 360;
  const satScale = parseFloat(satSlider.value) / 100;
  const valScale = parseFloat(valSlider.value) / 100;

  let wasmTime = 0;
  let jsTime = 0;

  // 처리 시작 시각 표시
  timeWasmDisplay.textContent = "처리 중...";
  timeJsDisplay.textContent = "처리 중...";

  let wasmDone = false;
  let jsDone = false;

  function checkBothDone() {
    if (wasmDone && jsDone) {
      // 승자 표시
      winnerDisplay.className = "winner";
      if (wasmModule && wasmTime > 0 && jsTime > 0) {
        const speedup = (jsTime / wasmTime).toFixed(2);
        if (wasmTime < jsTime) {
          winnerDisplay.textContent = `🏆 WASM 승리! ${speedup}배 빠름`;
          winnerDisplay.style.color = "#0066cc";
        } else {
          winnerDisplay.textContent = `🏆 JavaScript 승리! ${(
            wasmTime / jsTime
          ).toFixed(2)}배 빠름`;
          winnerDisplay.style.color = "#cc6600";
        }
      }
      isProcessing = false;
    }
  }

  // WASM 버전 (비동기)
  if (wasmModule) {
    setTimeout(() => {
      const startWasm = performance.now();

      const dataWasm = new Uint8ClampedArray(originalData.data);
      const dataLength = dataWasm.length;

      //  WebAssembly의 메모리 힙에서 메모리를 할당
      const dataPtr = wasmModule._malloc(dataLength);

      // js에서 wasm 메모리에 접근
      const heap = new Uint8Array(
        wasmModule.HEAPU8.buffer,
        dataPtr,
        dataLength
      );
      // 이미지 데이터를 wasm 메모리로 복사
      heap.set(dataWasm);

      wasmModule.applyHsvAdjustment(
        dataPtr,
        dataLength,
        hueShift,
        satScale,
        valScale
      );

      dataWasm.set(
        new Uint8Array(wasmModule.HEAPU8.buffer, dataPtr, dataLength)
      );
      wasmModule._free(dataPtr);

      const imageDataWasm = new ImageData(
        dataWasm,
        originalData.width,
        originalData.height
      );
      ctxWasm.putImageData(imageDataWasm, 0, 0);

      wasmTime = performance.now() - startWasm;
      timeWasmDisplay.textContent = `${wasmTime.toFixed(2)}ms ✓`;

      wasmDone = true;
      checkBothDone();
    }, 0);
  } else {
    timeWasmDisplay.textContent = "로딩 중...";
    wasmDone = true;
  }

  // JavaScript 버전 (비동기)
  setTimeout(() => {
    const startJs = performance.now();

    const dataJs = new Uint8ClampedArray(originalData.data);
    applyHsvJs(dataJs, hueShift, satScale, valScale);

    const imageDataJs = new ImageData(
      dataJs,
      originalData.width,
      originalData.height
    );
    ctxJs.putImageData(imageDataJs, 0, 0);

    jsTime = performance.now() - startJs;
    timeJsDisplay.textContent = `${jsTime.toFixed(2)}ms ✓`;

    jsDone = true;
    checkBothDone();
  }, 0);
}

function scheduleUpdate() {
  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateImage();
      updateScheduled = false;
    });
  }
}

// ========================================
// 이벤트 리스너
// ========================================
// WASM 모듈 로드
createModule()
  .then((module) => {
    wasmModule = module;
    wasmStatus.textContent = "로드 완료 ✓";
    wasmStatus.style.color = "green";
    console.log("WASM 모듈 로드 완료", module);
  })
  .catch((err) => {
    wasmStatus.textContent = "로드 실패 ✗";
    wasmStatus.style.color = "red";
    console.error("WASM 로드 에러:", err);
  });

// 슬라이더 값 표시 업데이트
hueSlider.addEventListener("input", (e) => {
  document.getElementById("hueValue").textContent = e.target.value;
});
satSlider.addEventListener("input", (e) => {
  document.getElementById("satValue").textContent = e.target.value;
});
valSlider.addEventListener("input", (e) => {
  document.getElementById("valValue").textContent = e.target.value;
});

// 이미지 업로드
imgInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    // 원본 사이즈 그대로 사용
    canvasWasm.width = img.width;
    canvasWasm.height = img.height;
    canvasJs.width = img.width;
    canvasJs.height = img.height;

    ctxWasm.drawImage(img, 0, 0);
    originalData = ctxWasm.getImageData(
      0,
      0,
      canvasWasm.width,
      canvasWasm.height
    );
    updateImage();
  };
  img.src = URL.createObjectURL(file);
});

// 슬라이더 변경 시 이미지 업데이트 (throttle 적용)
[hueSlider, satSlider, valSlider].forEach((slider) => {
  slider.addEventListener("input", scheduleUpdate);
});
