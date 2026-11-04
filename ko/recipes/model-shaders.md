# 모델 셰이더

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션 확인) · 상태: Analyzed (v5 헤더 사양에 맞춰 작성)

v5 Model 훅과 새 플래그로, **v5 이전에는 불가능했던 「지금 무엇을 보고 있는가」 선택**을 하는 레시피. 기초: [모델과 텍스처](../guides/models.md).

## 손에 든 아이템 발광

1인칭 셰이더 작가가 v1 때부터 바라던 것을 두 줄로:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 월드와 손의 분리

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 빛나는 검 끝 (localPosition)

`localPosition` 은 모델과 함께 회전한다 — 월드 좌표 추측 없이 「모델의 어디인가」:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

주의: 실제 `localPosition` 범위는 모델마다 다르다 — 실기기에서 확인하고 방어적으로 `clamp` 하라.

## 떨어진 아이템 강조

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## 플레이어 스킨의 시원한 림 (lifeform)

대부분의 모델은 `textureId: 0` (스킨). `surface.colour` 에는 이미 스킨 × tint 가 있다:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## 바람에 흔들리는 식물 (allow 한정)

식물 (`flags.flat`) 은 모델로 그려진다 — 버텍스 훅으로 흔든다:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(식물은 `flags.vegetation` 이기도 하다: `flat` = 「교차 평면으로 그려진다」, `vegetation` = 「식물이다」 — 잔디와 꽃은 둘 다 해당.)

## 아틀라스 텍스처 모델 면만

블록 모델 면 (반 블록, 계단…) 은 아틀라스 `textureId` 를 싣는다. `textureId != 0u` 로 골라낸다:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` 면 (스킨) 은 흰색으로 샘플된다 — 오류 아님 ([모델 자체 텍스처](../api/texture-api.md#모델-자체-텍스처-textureid-0)).

## 방어구와 나머지

`flags.lifeform` 은 방어구와 화장품을 포함한다 ([플래그](../api/flags.md)). 더 세분화된 입력은 없다. `localPosition` (배치) 이나 `overlayColour` 유무를 실용적 근사로 조합하라.

## 지형과의 공유

완전 블록과 블록 모델에 걸쳐 균일한 그레이딩:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

공유 함수 패턴은 기본 팩 템플릿 자신이 권하는 방식이다 ([훅](../getting-started/hooks.md#폴백과-코드-공유)).

## 관련 문서

- [모델과 텍스처](../guides/models.md) · [인챈트 효과](enchant-effects.md) · [플래그](../api/flags.md) · [구조체](../api/structures.md)
