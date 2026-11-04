# 전처리기

> 대상 API: 5 · 대상 빌드: `xkg8x` · 상태: Analyzed (라이브 검증기에서 복원)

조건부 컴파일이 지원하는 것은 `#define NAME` (값 없음) / `#ifdef` / `#ifndef` / `#else` / `#endif` 뿐이다. `#` 은 행 머리에 붙인다 (함수 안도 상관없다). 플래그명 대조는 대소문자를 구별하지 않으며, 틀린 `#ifdef` 이름을 쓰면 오류 메시지가 공식 목록을 보여준다.

## 정의되는 매크로 (3개)

| 매크로 | 정의되는 곳 | 전형적 용도 |
|---|---|---|
| `BLOXD_STRICT` | strict 게임 베리언트 (strict.terrain / strict.liquid / strict.model) | 버텍스 훅 전체와 `discard` 를 `#ifndef BLOXD_STRICT` 로 감싸기 |
| `BLOXD_ALPHA` | `BloxdSurface.alpha` 가 존재하는 베리언트 — 모든 액체 + 비strict 지형/모델 | alpha 를 만지는 코드 감싸기 |
| `BLOXD_SCENE_DEPTH` | 모든 액체 베리언트 | `bloxdOpaqueBehind()` 호출 감싸기 |

## 매크로 × 베리언트 매트릭스

| 베리언트 | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

지형 / 액체 / 모델의 차이는 **별개의 프로그램이지 매크로가 아니다** — `#ifdef BLOXD_TERRAIN` 은 존재하지 않는다.

## 제거된 매크로

- **`BLOXD_LIGHTING`** — v5 에서 제거. 라이팅 상태는 컴파일 분기가 아니라 [`bloxdLit()`](lighting.md#bloxdlit--게이트) 의 런타임 질문이다. 쓰면 다음과 함께 검증에 실패한다:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

v4 이주 패턴:

```wgsl
// v4 (fails validation on v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrated)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... lighting-enabled processing
}
```

## 예시

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain has alpha only in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex hooks always need this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## 매크로가 구조체를 결정한다

- `BloxdSurface.alpha` 는 `#ifdef BLOXD_ALPHA` 안에서만 존재한다
- `bloxdOpaqueBehind()` 는 `#ifdef BLOXD_SCENE_DEPTH` 안에서만 호출할 수 있다

[구조체](structures.md#조건부-필드--매크로) 를 보라.

## 관련 문서

- [시작하기: 베리언트](../getting-started/variants.md) · [엔진 내부와 연구: 셰이더 검증](../internals/shader-validation.md)
