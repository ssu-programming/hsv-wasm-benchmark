#!/bin/bash

# Emscripten으로 WASM 컴파일
# 사용법: ./build.sh

emcc hsv.cpp \
  -o hsv.js \
  -O3 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","HEAPU8"]' \
  -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s EXPORT_NAME="createModule" \
  --bind

echo "빌드 완료: hsv.js, hsv.wasm"
