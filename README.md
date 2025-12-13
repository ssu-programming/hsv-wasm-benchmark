# hsv-wasm-benchmark

## 1. 팀 정보

- **팀명**: 1조
- **팀장**: 김나윤
- **팀원**: 강명준, 장우진

## 2. 프로젝트 개요 및 주요 기능

### 개요

WebAssembly와 JavaScript의 성능을 비교하는 HSV 이미지 조정 웹 애플리케이션입니다. 동일한 이미지 처리 알고리즘을 C++(WebAssembly)와 JavaScript로 각각 구현하여 실시간으로 성능을 측정하고 비교합니다.

### 주요 기능

#### 1. HSV 이미지 실시간 조정

- **색상(Hue)**: 0° ~ 360° 범위에서 색상환 조정
- **채도(Saturation)**: 0% ~ 100% 범위에서 색의 선명도 조정
- **명도(Value)**: 0% ~ 100% 범위에서 색의 밝기 조정
- 슬라이더를 통한 직관적인 실시간 조작

#### 2. WebAssembly vs JavaScript 성능 벤치마킹

- 동일한 이미지를 WASM과 JS로 동시 처리
- 밀리초 단위 실시간 처리 시간 측정

- 성능 차이를 배수로 시각화 표시
- 대용량 이미지에서 3-5배 성능 향상

#### 3. 고성능 RGB ↔ HSV 변환

- C++로 작성된 최적화된 색상 변환 알고리즘
- Emscripten을 통한 WebAssembly 컴파일
- 메모리 효율적인 픽셀 단위 병렬 처리
- requestAnimationFrame 기반 스케줄링으로 부드러운 UI

## 3. 실행 방법

```bash
# 설치

npm install

# 개발 서버 실행

npm run dev

# 빌드
npm run build
```

## 4. 역할 분담

| 이름   | 역할        | 담당 업무          |
| ------ | ----------- | ------------------ |
| 김나윤 | 백앤드 개발 | hsv 변환 코드 개발 |
| 강명준 | 프론트 개발 | UI/UX 개발         |
| 장우진 | 기획 및 QA  | QA 및 개발보조     |

## 5. 개발 중 어려웠던 점과 해결 방법

### JavaScript에서 C++로 이미지 데이터 전달 최적화

**어려웠던 점**

- 처음에는 JavaScript 배열을 C++에 직접 전달하는 방식을 시도했으나, 데이터 복사 오버헤드로 인해 성능이 크게 저하되었습니다.
- 특히 대용량 이미지의 경우 배열 복사에만 상당한 시간이 소요되어 WebAssembly의 성능 이점이 상쇄되는 문제가 발생했습니다.

**해결 방법**

- JavaScript에서 이미지 데이터를 WASM의 Linear Memory에 직접 복사하고, 메모리 주소(포인터)만 C++ 함수에 전달하는 방식으로 변경했습니다.
- `malloc`/`free`로 WASM 힙 메모리를 직접 관리하고, `HEAPU8` 버퍼를 활용하여 제로카피 방식으로 데이터를 전달했습니다.
- 결과적으로 데이터 전달 오버헤드를 최소화하여 실제 연산 성능에 집중할 수 있었습니다.

```javascript
// Control.tsx:328-350
const ptr = wasmModule._malloc(data.length);
wasmModule.HEAPU8.set(data, ptr); // Linear Memory에 직접 복사
wasmModule.applyHsvAdjustment(ptr, data.length, hueShift, satScale, valScale);
const result = wasmModule.HEAPU8.subarray(ptr, ptr + data.length);
wasmModule._free(ptr);
```

## 6. 가산점 항목

### 추가 기능 구현

- React Router를 활용한 SPA 구조
- 실시간 성능 비교 및 승자 표시 기능
- 이미지 업로드 및 실시간 미리보기

### UI/UX 개선

- 슬라이더를 통한 직관적인 HSV 값 조정
- 양쪽 캔버스에 동시 렌더링으로 즉각적인 비교 가능
- 처리 시간 및 성능 차이를 실시간으로 시각화

### 성능 최적화 및 기술 조사

#### 1. 컴파일 최적화

- `-O3` 플래그를 통한 최고 수준의 컴파일러 최적화
- ES6 모듈화로 현대적인 JavaScript 통합
- `ALLOW_MEMORY_GROWTH`로 동적 메모리 할당 지원

#### 2. 알고리즘 최적화 (hsv.cpp:19-28)

- **나눗셈 → 곱셈 변환**: 역수를 미리 계산하여 나눗셈을 곱셈으로 변환 (`invD = 1.0f / d`)
- **상수 사전 계산**: `1/6` 값을 미리 계산 (`inv6 = 0.16666667f`)
- **조건문 최적화**: 불필요한 분기 제거로 파이프라인 효율 향상
- **float 타입 활용**: 정밀도와 속도의 균형을 위한 단정밀도 부동소수점 사용

#### 3. 메모리 최적화

- **직접 메모리 접근**: WASM 힙(`HEAPU8.buffer`)을 직접 조작하여 오버헤드 감소
- **수동 메모리 관리**: `malloc`/`free`로 메모리 할당/해제 제어
- **제로카피 기법**: 포인터를 통한 데이터 전달로 복사 비용 최소화
- **최적 타입 사용**: `Uint8ClampedArray`로 픽셀 데이터 처리


#### 4. 기술 조사

- **Emscripten 툴체인**: C++ 코드를 WebAssembly로 변환하는 컴파일 과정 연구
- **WebAssembly 메모리 모델**: Linear Memory 구조 및 JavaScript와의 상호작용
- **색공간 변환 알고리즘**: RGB ↔ HSV 수학적 변환 로직 구현 및 최적화
- **성능 측정 API**: `performance.now()`를 활용한 고정밀 타이밍 측정
- **CORS 헤더 설정**: `Cross-Origin-Embedder-Policy`로 SharedArrayBuffer 지원

## 7. Latency 측정 테이블

| 구분      | JavaScript | WebAssembly |
| --------- | ---------- | ----------- |
| hsvToRgb  | 93.625ms   | 82.565ms    |
| adjustHsv | 75.660ms   | 39.370ms    |
| rgbToHsv  | 166.695ms  | 74.805ms    |
