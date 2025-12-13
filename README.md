# hsv-wasm-benchmark

## 1. 팀 정보

- **팀명**: 1조
- **팀장**: 김나윤
- **팀원**: 강명준, 장우진

## 2. 프로젝트 개요 및 주요 기능

### 프로젝트 배경

웹에서 고해상도 이미지를 대상으로 HSV(색조·채도·명도)를 실시간으로 조절할 때 JavaScript 기반 연산의 성능 한계가 명확히 드러났습니다. JavaScript는 싱글 스레드 구조를 가지기 때문에, 연속적인 이미지 조작이나 고해상도 처리 상황에서는 연산 부하로 인해 인터랙션이 끊기는 문제가 발생합니다.

### 프로젝트 목적

본 프로젝트에서는 **실시간 HSV 이미지 조정 웹 애플리케이션**을 구현하고, **JavaScript와 C++ 기반 WebAssembly로 동일한 이미지 처리 로직을 각각 구현해 실제 처리 속도를 정량적으로 비교**했습니다. 이를 통해 기존 JS 기반 이미지 처리의 한계를 확인하고, WebAssembly를 활용한 병목 개선 가능성과 성능 차이를 분석하는 것을 목표로 했습니다.

### 주요 기능

#### 1. HSV 이미지 실시간 조정

- **색상(Hue)**: 0° ~ 360° 범위에서 색상환 조정
- **채도(Saturation)**: 0% ~ 200% 범위에서 색의 선명도 조정
- **명도(Value)**: 0% ~ 200% 범위에서 색의 밝기 조정
- 슬라이더를 통한 직관적인 실시간 조작

#### 2. WebAssembly vs JavaScript 성능 벤치마킹

- 동일한 이미지를 WASM과 JS로 동시 처리
- `MessageChannel`을 활용하여 최대한 유사한 시점에 실행되도록 스케줄링
- `performance.now()`를 활용한 밀리초 단위 실시간 처리 시간 측정
- 성능 차이를 배수로 시각화 표시
- 대용량 이미지에서 약 2~3배 성능 향상

#### 3. 이미지 처리 과정

1. **원본 RGB 형식의 이미지**를 Canvas에서 픽셀 데이터로 가져오기
2. 픽셀 단위로 **RGB를 HSV로 변환**
3. 사용자가 조절한 HSV 값 적용
4. 조정된 HSV를 다시 **RGB 형식으로 변환**
5. 최종 결과를 Canvas에 그려서 화면에 표시

## 3. 실행 방법

# 설치

npm install

# 개발 서버 실행

npm run dev

# 빌드

npm run build## 4. 역할 분담
| 이름 | 역할 | 담당 업무 |
|------|------|-----------|
| 김나윤 | 백엔드 개발 | HSV 색공간 변환 핵심 모듈을 C++로 구현하고 WebAssembly로 빌드 |
| 강명준 | 프론트엔드 개발 | UI 개발 및 JavaScript 기반 인터페이스 구성, WebAssembly 모듈 연동 |
| 장우진 | 기획 및 QA | 전체적인 기획과 성능 검증 담당 |

## 5. 주요 구현 및 최적화 기법

### 5.1 메모리 최적화 (제로카피 방식)

#### 포인터 직접 접근

// hsv.cpp:62
uint8_t* data = reinterpret_cast<uint8_t*>(dataPtr);- JavaScript에서 전달된 메모리 주소를 포인터로 변환

- 데이터 복사 없이 WASM 힙 메모리에 직접 접근
- 메모리 복사 오버헤드 제거

#### 픽셀 단위 루프 최적화

// hsv.cpp:64
for (int i = 0; i < length; i += 4) {- RGBA 픽셀 단위(4바이트)로 처리

- 루프 횟수를 1/4로 감소
- 연속 메모리 접근으로 CPU 캐시 효율 향상

#### In-place 메모리 수정

// hsv.cpp:89-91
data[i] = static*cast<uint8_t>(r * 255.0f);
data[i + 1] = static*cast<uint8_t>(g * 255.0f);
data[i + 2] = static_cast<uint8_t>(b \* 255.0f);- 별도 버퍼 없이 원본 메모리에 직접 쓰기

- 메모리 할당/해제 오버헤드 제거
- WASM에서 수정한 메모리를 JavaScript에서 바로 사용 가능

### 5.2 알고리즘 최적화

#### 나눗셈을 곱셈으로 변환p

// hsv.cpp:19-20
float invD = 1.0f / d; // 역수 미리 계산
const float inv6 = 0.16666667f; // 1/6을 미리 계산
h = ((g - b) _ invD + ...) _ inv6; // 나눗셈 대신 곱셈 사용- 나눗셈(느림) 대신 곱셈(빠름) 사용

- 역수를 미리 계산하여 루프 내 반복 계산 제거
- 약 10-30배 빠른 연산

#### 조건부 범위 체크 최적화

// hsv.cpp:76-77, 80, 83
if (h >= 1.0f) h -= 1.0f;
if (s > 1.0f) s = 1.0f;
if (v > 1.0f) v = 1.0f;- 간단한 조건문으로 범위 제한

- 복잡한 함수 호출 대신 직접 처리

### 5.3 WASM Linear Memory 활용

cript
// Control.tsx:328-350
const ptr = wasmModule.\_malloc(data.length);
wasmModule.HEAPU8.set(data, ptr); // Linear Memory에 직접 복사
wasmModule.applyHsvAdjustment(ptr, data.length, ...);
const result = wasmModule.HEAPU8.subarray(ptr, ptr + data.length); // 뷰만 생성
wasmModule.\_free(ptr);- JavaScript 데이터를 WASM 메모리로 한 번에 복사

- 결과를 배열로 복사하지 않고 같은 메모리 영역을 뷰 형태로 가져옴
- 중간 버퍼 불필요, 메모리 이동 횟수 최소화

### 5.4 컴파일 최적화

sh

# build.sh:8

-O3- 함수 인라이닝, 루프 최적화, 데드 코드 제거, 레지스터 할당 최적화 자동 적용

- 디버그 빌드 대비 훨씬 빠른 실행 속도
- 컴파일 타임에 최적화 결정으로 런타임 오버헤드 없음

## 6. 개발 중 어려웠던 점과 해결 방법

### JavaScript에서 C++로 이미지 데이터 전달 최적화

**어려웠던 점**

- 처음에는 JavaScript 배열을 C++에 직접 전달하는 방식을 시도했으나, 데이터 복사 오버헤드로 인해 성능이 크게 저하되었습니다.
- 특히 대용량 이미지의 경우 배열 복사에만 상당한 시간이 소요되어 WebAssembly의 성능 이점이 상쇄되는 문제가 발생했습니다.

**해결 방법**

- JavaScript에서 이미지 데이터를 WASM의 Linear Memory에 직접 복사하고, 메모리 주소(포인터)만 C++ 함수에 전달하는 방식으로 변경했습니다.
- `malloc`/`free`로 WASM 힙 메모리를 직접 관리하고, `HEAPU8` 버퍼를 활용하여 제로카피 방식으로 데이터를 전달했습니다.
- 결과적으로 데이터 전달 오버헤드를 최소화하여 실제 연산 성능에 집중할 수 있었습니다.

## 7. 성능 비교 결과

### JavaScript의 한계

- 해상도가 높아질수록 처리 시간이 급격히 증가
- 슬라이더 조작 시 지연 발생
- 메인 스레드에서 동기 처리로 인한 UI 응답성 저하
- 고해상도 이미지에서는 실시간 처리가 어려움

### WebAssembly의 장점

- 대용량 이미지에서 JavaScript 대비 약 2~3배 빠른 처리 속도
- 해상도 증가에도 처리 시간 증가폭이 완만함
- 슬라이더 조작 시 즉각적인 반응
- 반복 연산이 많은 경우에도 안정적인 성능 유지

### 결론

고해상도 이미지 처리나 반복 연산 비중이 큰 작업에서는 WebAssembly가 JavaScript에 비해 확실한 성능적 이점을 갖는다는 것을 확인할 수 있었습니다.

## 8. 가산점 항목

### 추가 기능 구현

- React Router를 활용한 SPA 구조
- 실시간 성능 비교 및 승자 표시 기능
- 이미지 업로드 및 실시간 미리보기
- `MessageChannel`을 활용한 공정한 성능 비교

### UI/UX 개선

- 슬라이더를 통한 직관적인 HSV 값 조정
- 양쪽 캔버스에 동시 렌더링으로 즉각적인 비교 가능
- 처리 시간 및 성능 차이를 실시간으로 시각화

### 기술 조사

- **Emscripten 툴체인**: C++ 코드를 WebAssembly로 변환하는 컴파일 과정 연구
- **WebAssembly 메모리 모델**: Linear Memory 구조 및 JavaScript와의 상호작용
- **색공간 변환 알고리즘**: RGB ↔ HSV 수학적 변환 로직 구현 및 최적화
- **성능 측정 API**: `performance.now()`를 활용한 고정밀 타이밍 측정
- **CORS 헤더 설정**: `Cross-Origin-Embedder-Policy`로 SharedArrayBuffer 지원
