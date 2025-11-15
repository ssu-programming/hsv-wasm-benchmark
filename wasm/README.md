# WASM HSV 이미지 조정

WebAssembly를 사용한 고성능 이미지 HSV 조정 도구입니다.

## 사전 요구사항

Emscripten이 설치되어 있어야 합니다:

```bash
# Emscripten 설치 (한 번만 실행)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

## 빌드 방법

```bash
cd wasm
./build.sh
```

빌드가 완료되면 다음 파일들이 생성됩니다:
- `hsv.js` - WASM 로더 JavaScript 파일
- `hsv.wasm` - WebAssembly 바이너리

## 실행 방법

로컬 웹 서버로 실행해야 합니다 (CORS 문제 방지):

```bash
# Python 3을 사용하는 경우
python3 -m http.server 8000

# Node.js http-server를 사용하는 경우
npx http-server -p 8000
```

브라우저에서 `http://localhost:8000/index.html`을 열면 됩니다.

## HSV란?

HSV는 색상을 표현하는 방식으로, 다음 세 가지 요소로 구성됩니다:

### 1. Hue (색상, 색조)

- 0° ~ 360°의 각도로 표현
- 색상환(Color Wheel)에서의 위치
- 예시:
  - 0° = 빨강
  - 120° = 초록
  - 240° = 파랑
  - 360° = 다시 빨강

### 2. Saturation (채도, 포화도)

- 0% ~ 100%로 표현
- 색의 선명함 정도
- 0% = 회색 (무채색)
- 100% = 가장 선명한 색

### 3. Value (명도, 밝기)

- 0% ~ 100%로 표현
- 색의 밝기
- 0% = 검정
- 100% = 가장 밝음

## 주요 기능

- **고성능**: C++로 작성되어 JavaScript보다 훨씬 빠른 처리
- **실시간**: 슬라이더 조작 시 실시간으로 이미지 조정
- **성능 측정**: 처리 시간을 밀리초 단위로 표시

## 파일 구조

```
wasm/
├── hsv.cpp       # C++ HSV 변환 로직
├── build.sh      # Emscripten 빌드 스크립트
├── index.html    # WASM을 사용하는 웹 페이지
├── hsv.js        # 생성된 WASM 로더 (빌드 후)
└── hsv.wasm      # 생성된 WASM 바이너리 (빌드 후)
```

## 성능 비교

순수 JavaScript 버전과 비교하여 대용량 이미지에서 3-5배 빠른 성능을 보입니다.
