# 텍스처 API

> 대상 API: 5 · 대상 빌드: `xkg8x` · 상태: Verified (API 는 v4 이후 불변, v5 빌드에서 재확인)

게임 자신의 텍스처를 읽는 API: 함수 2개, 이름 상수 계열, 입력 필드 4개. 헤더 자신의 한 줄 요약: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **호출 가능 범위**: **서피스 / light 훅만** (버텍스 훅에서 도달하면 「reaches」 진단으로 실패한다)

**엔진 자신의 샘플러와 같은 방식**으로 텍셀을 읽는다 — 같은 `texture_2d_array<f32>` 아틀라스, 같은 샘플러, `round(mipLevel)` 에서의 `textureSampleLevel` — 따라서 읽은 텍셀은 엔진이 그린 텍셀과 구조적으로 일치한다.

### bloxdTexel 이 무엇을 읽는가는 파이프라인에 달려 있다

엔진이 파이프라인마다 다른 `bloxdTexel` 정의를 생성하므로, 하나의 함수에 세 가지 동작이 있다:

| 파이프라인 | `textureId == 0` | 0 이 아닌 `textureId` | 비고 |
|---|---|---|---|
| **아틀라스 파이프라인** — 지형, 액체, 블록 아틀라스에서 그리는 블록 모델 | `vec4f(1.0)` (흰색 — 「텍스처 없음」) | 해당 **아틀라스 엔트리**를 샘플 | 이름 상수가 적용된다. 애니메이션·회전은 자동 |
| **자체 텍스처 파이프라인** — 메시가 자기 디퓨즈 텍스처를 싣는 모델 (플레이어 스킨, 몹 텍스처, 아이템 스프라이트) | 건넨 uv 로 **메시 자신의 텍스처**를 샘플 | `vec4f(1.0)` (흰색) | 스코프에 텍스처가 정확히 하나. 이름 상수는 비적용 |
| **무텍스처 파이프라인** | 흰색 | 흰색 | 스텁. `bloxdTextureSize() -> vec2u(1u)` |

아틀라스 파이프라인의 의미를 상세히:

- **`textureId == 0` 은 `vec4f(1.0)` (흰색) 을 반환한다.** 이것이 「텍스처 없음」 id 이다. 텍스처 없는 면은 네 입력 필드 모두 0 을 실으므로, `bloxdTexel(surface.textureId, ...)` 은 언제나 안전하게 호출할 수 있다
- **애니메이션 텍스처는 자동으로 현재 프레임을 반환한다.** 프레임은 게임의 애니메이션 시계로 진행된다 — 멈추거나 스텝할 수 없고, 할 필요도 없다
- **`mipLevel` 은 엔진 자신과 정확히 같게 클램프된다**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`. 범위 밖 밉은 오류 대신 포화한다
- **프래그먼트 자신의 `textureRotation` 이 건넨 uv 에 적용된다** (아래 참조)

아틀라스 파이프라인에서 `textureId` 는 **1 기반**이다: `bloxdTextureIdGrassTop` 이 id 이고, 엔진이 그를 위해 샘플하는 아틀라스 레이어는 `id - 1` 이다. id 는 텍스처 **이름** 기준으로 안정적이지 아틀라스 슬롯 기준이 아니다 — 엔진은 빌드마다 아틀라스를 재배열하지만, 이름 비교는 의미를 유지한다.

### 만능 호출 패턴

```wgsl
// Works in every pipeline: on atlas faces it samples the atlas entry;
// on own-texture models textureId is 0 and it samples the model's own texture.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` 에는 이미 `texture × tint × ambient occlusion` (스킨·tint 포함) 이 들어 있으므로, 텍셀 읽기는 *추가* 디테일 — 휘도 추정, 텍스처별 효과 — 용도이지 기본색 재구축용이 아니다.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **호출 가능 범위**: 서피스 / light 훅만

`textureDimensions(textureAtlas0, <clamped mip>)`. 각 텍스처는 배열 레이어 하나를 차지하므로, 이것은 곧 *해당 밉에서의 임의 텍스처 하나의 텍셀 크기*이기도 하다 (아틀라스 티어의 모든 블록 텍스처는 같은 정사각 크기다).

```wgsl
// texel-aligned resampling for a "pixel-art" look
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## 모델 자체 텍스처 (textureId: 0)

헤더 주석: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — 대부분의 모델 면에는 *아틀라스* 텍스처가 없다. 메시가 자기 텍스처를 스스로 싣기 때문이다:

- **플레이어 스킨** 등 비아틀라스 모델 텍스처 (몹, 아이템 스프라이트) 는 `textureId: 0` 으로 도착한다
- 그런 파이프라인에서 `bloxdTexel(0u, uv, mip)` 은 **메시 자신의 텍스처**를 샘플한다 (위 표 참조). 0 이 아닌 id 는 흰색을 반환한다 — 스코프에 아틀라스가 없다
- 헤더의 필드는 문서대로 동작한다: `uv` 는 모델 텍스처의 0–1 을 덮고, `mipLevel` 은 그 면의 밉이다
- **`bloxdTextureSize()`** 는 *파이프라인이 샘플하는 텍스처*의 크기를 보고한다: 아틀라스 파이프라인에서는 아틀라스, 자체 텍스처 파이프라인에서는 모델 자신의 텍스처

아틀라스 면에서만 의미 있는 효과는 가드해야 한다:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the block atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **스킨과 아틀라스**: 아틀라스는 텍스처 *이름* 을 레이어에 대응시키고 `bloxdTextureId*` 로 비교할 수 있다. 모델 자체 텍스처 (스킨) 는 그 네임스페이스에 없어 id 0 으로 도착한다. `surface.colour` 에는 이미 스킨 × tint 가 들어 있으므로 그것부터 쓴다

## bloxdTextureId*: 이름 붙은 텍스처 상수

사용 가능한 모든 텍스처 이름이 비교 가능한 `const` 가 된다. **철자는 파일명의 CamelCase** 다:

| 텍스처 파일 | 상수 | 비고 |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | 엔진 자신의 예 |
| `lava0.png` (프레임 `lava0`–`lava7`) | `bloxdTextureIdLava` | 애니메이션 계열: 프레임 접미사는 정식명에서 떨어져 나간다 |
| `black_portal0.png` (프레임 0–3) | `bloxdTextureIdBlackPortal` | 같은 규칙 |
| `radar_screen0` (회전 사본 `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | 회전 계열: 루트명으로 접힌다 |

### 철자 규칙과 명명의 자유

- **생성 규칙** (검증기에서 복원): 이름을 비영숫자 연속으로 분할해 각 부분을 대문자화하고, `bloxdTextureId` 접두사 뒤에 이어 붙인다
- **대소문자와 언더스코어는 구별되지 않는다**: 역방향 대조 (팩이 쓴 이름 → 레지스트리 이름) 는 쪽의 철자와 엔진 쪽 철자를 모두 접으므로, 예컨대 `bloxdTextureIdGrassTop` 과 `bloxdTextureId_grass_top` 은 **같은 상수**로 해석된다
- **애니메이션 텍스처는 프레임 번호를 받지 않는다**: 이름은 `lava`. `lava0` 은 전용 오류이다
- **회전 계열은 루트명을 쓴다**: 회전 사본 철자를 쓰면 전용 메시지가 나온다

### 이름 해석 오류 (검증기에서 그대로)

> **접두사 오철자 / 대소문자:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **애니메이션 프레임:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **회전 사본:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **접은 뒤 모호:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **미발견 (제안 있음):** `There's no texture called X. Did you mean bloxdTextureIdY?` — 제안 임계값은 레벤슈타인 거리 `max(2, floor(len/4)) + 1`
>
> **미발견 (제안 없음):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> 이 메시지의 `BLOCK_TEXTURES.md` 는 게임 자신의 내부 텍스처명 목록으로, 엔진 검증기가 참조하는 것이다 — 이 사이트의 페이지가 아니다. 여기서의 대응물은 [텍스처 카탈로그](texture-catalog.md) 다.

### 참조된 상수만 내보내진다

헤더의 `bloxdTextureId*` 블록은 실제로 참조한 이름에서 **팩마다** 생성된다 — 상수 3개를 쓰는 팩은 `const` 3줄을 받지 ~900줄을 받지 않는다.

## 입력 필드

`BloxdSurfaceIn` / `BloxdLightIn` 의 텍스처 필드 4개:

| 필드 | 형 | 설명 |
|---|---|---|
| `textureId` | `u32` | 이 면의 텍스처. `bloxdTextureId*` 와 비교. 0 = 없음 |
| `textureRotation` | `u32` | 시계방향 4분회전 (0–3), `bloxdTexel` 이 적용 |
| `uv` | `vec2f` | 텍스처가 0–1 을 덮는다. `fract(uv)` 가 그려진다 |
| `mipLevel` | `f32` | 밉 레벨: 0 = 풀사이즈, 1 = 절반… |

## 회전의 미묘함 — 중립 샘플러

`bloxdTexel` 은 건넨 uv 를 **현재 프래그먼트의** `textureRotation` 만큼 역회전시킨다 — 어떤 id 를 건넸는지와 무관하게. 흔한 두 경우:

- 이 면 자신의 텍스처를 `surface.uv` 로 **재샘플** — uv 는 면의 회전된 좌표계에 있고, 역회전이 아틀라스 공간으로 되돌린다. 의도된 주 용도다
- 면이 회전된 상태에서 아틀라스 공간 uv 로 **다른 텍스처**를 샘플 — 역회전은 여전히 작동하고 샘플은 회전된 채 떨어진다. 이것이 함정이다

엔진은 텍스처별 회전을 조회할 수 없고 (회전은 면의 지오메트리 데이터다) 항상 프래그먼트의 값을 쓴다. 다른 텍스처를 회전 중립적으로 샘플하려면, 같은 4분회전으로 uv 를 미리 돌려 상쇄한다:

```wgsl
// Rotation-neutral texel sampling: pre-rotate uv so bloxdTexel's counter-rotation
// (by this face's textureRotation) cancels out. Pass surface.textureRotation as r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` 은 보정이 필요 없다. 대부분의 면은 0 을 실지만, 배포 팩은 이를 가정해선 안 된다.)

## 작동 예시

### 텍셀 휘도에서의 emission

면의 밉보다 한 단계 위를 샘플하면 거리에 강한 부드러운 블록 평균을 얻는다:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### 텍스처별 효과

`textureId` 를 비교해 고른 텍스처만 골라낸다 (광석 반짝임 등의 공식적 방법):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### 피사계 심도풍 거리 블러

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // division guard
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(비율 트릭은 엔진의 `colour = texture × tint × AO` 를 보존한다: 혼합된 텍셀을 원본 텍셀로 나누면 텍스처 내용이 상쇄되고, 블러 계수만 `surface.colour` 에 곱해 남는다. 흰색 읽기 — 텍스처 없는 면 — 는 가드가 효과를 건너뛰게 한다.)

## 텍스처 API 가 갈 수 없는 곳

- **버텍스 훅에서 호출 불가** — 「reaches」 진단이 거부한다
- **텍스처를 추가할 수 없다** — 아틀라스는 엔진의 것이다. API 는 읽기만 한다. 커스텀 텍스처는 텍스처팩 시스템의 영역이다
- **비아틀라스 렌더러 구성은 스텁으로 퇴화한다** — `bloxdTextureSize() -> vec2u(1u)`, `bloxdTexel(...) -> vec4f(1.0)`, 네 입력은 `0u, 0u, vec2f(0.0), 0.0` 이 흐른다. 진짜 아틀라스용으로 쓴 코드도 여전히 컴파일되고 실행된다 — 흰 텍셀과 1×1 크기가 보일 뿐. `textureId == 0` 을 견디는 코드는 이것도 견딘다

## 관련 문서

- **사용 가능 896 이름 전체** → [텍스처 카탈로그](texture-catalog.md)
- [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md) · [텍스처 샘플링](../internals/texture-sampling.md)
