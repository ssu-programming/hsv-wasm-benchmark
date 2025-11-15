#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <algorithm>
#include <cmath>

using namespace emscripten;

// RGB에서 HSV로 변환
void rgbToHsv(float r, float g, float b, float& h, float& s, float& v) {
    float max = std::max({r, g, b}); 
    float min = std::min({r, g, b}); 
    float d = max - min; // delta

    v = max; // 가장 밝은 채널의 값이 명도가 된다.
    s = (max == 0.0f) ? 0.0f : d / max; // 채도
    if (d == 0.0f) {
        h = 0.0f;
    } else {
        if (max == r) {
            h = ((g - b) / d + (g < b ? 6.0f : 0.0f)) / 6.0f;
        } else if (max == g) {
            h = ((b - r) / d + 2.0f) / 6.0f;
        } else {
            h = ((r - g) / d + 4.0f) / 6.0f;
        }
    }
}

// HSV에서 RGB로 변환
void hsvToRgb(float h, float s, float v, float& r, float& g, float& b) {
    float c = v * s;
    float x = c * (1.0f - std::abs(std::fmod(h * 6.0f, 2.0f) - 1.0f));
    float m = v - c;

    float r1 = 0, g1 = 0, b1 = 0;

    if (h < 1.0f / 6.0f) {
        r1 = c; g1 = x; b1 = 0;
    } else if (h < 2.0f / 6.0f) {
        r1 = x; g1 = c; b1 = 0;
    } else if (h < 3.0f / 6.0f) {
        r1 = 0; g1 = c; b1 = x;
    } else if (h < 4.0f / 6.0f) {
        r1 = 0; g1 = x; b1 = c;
    } else if (h < 5.0f / 6.0f) {
        r1 = x; g1 = 0; b1 = c;
    } else {
        r1 = c; g1 = 0; b1 = x;
    }

    r = r1 + m;
    g = g1 + m;
    b = b1 + m;
}

// JavaScript에서 직접 호출할 수 있는 버전 (메모리 주소 사용)
void applyHsvAdjustment(uintptr_t dataPtr, int length, float hueShift, float satScale, float valScale) {
    
    // 메모리 주소를 나타내는 정수 타입을 포인터로 변경
    uint8_t* data = reinterpret_cast<uint8_t*>(dataPtr);

    // 이미지 데이터는 1차원 바이트 배열로 저장, 하나의 픽셀이 4개의 연속된 바이트를 차지 (R,G,B,A)
    for (int i = 0; i < length; i += 4) {
        // RGB 값을 0-1 범위로 정규화
        float r = data[i] / 255.0f;
        float g = data[i + 1] / 255.0f;
        float b = data[i + 2] / 255.0f;

        // RGB -> HSV
        float h, s, v;
        rgbToHsv(r, g, b, h, s, v);

        // HSV 조정
        h = std::fmod(h + hueShift, 1.0f);
        s = std::min(s * satScale, 1.0f);
        v = std::min(v * valScale, 1.0f);

        // HSV -> RGB
        hsvToRgb(h, s, v, r, g, b);

        // 0-255 범위로 다시 변환
        data[i] = static_cast<uint8_t>(r * 255.0f);
        data[i + 1] = static_cast<uint8_t>(g * 255.0f);
        data[i + 2] = static_cast<uint8_t>(b * 255.0f);
        // data[i + 3]는 알파값으로 그대로 유지
    }
}

EMSCRIPTEN_BINDINGS(hsv_module) {
    function("applyHsvAdjustment", &applyHsvAdjustment);
}
