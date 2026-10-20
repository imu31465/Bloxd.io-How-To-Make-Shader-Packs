[← 이전 부](08-apiv2.md)·[매뉴얼로 돌아가기](README.md)

# 제9부: API Version 3 마이그레이션 가이드

대상 빌드: `3ymzdd.main.fae4743f.js` — **2026-10-19부터 정식 프로덕션 빌드**. bloxd.io가 프로덕션에서 제공하는 번들은 이 부를 처음 조사할 때 사용한 프리프로드 배포와 바이트 단위로 동일하다 (md5로 확인했으며, 메인 번들과 셰이더 팩 청크 모두 그러하다). 따라서 여기 적힌 내용은 그대로 프로덕션에 적용된다. 팩 모델은 v2 형태를 유지한다 (`pack.json` 필드, 로더 제한, uniform 레이아웃이 모두 같다).

이 가이드의 제1부~제7부는 여전히 v2 기준으로 작성되어 있다. 이 부는 [제8부](08-apiv2.md)와 같은 순서로 v2 → v3 이전 포인트와 v3의 새 기능을 모은다. 변환은 대부분 기계적이지만 (§47), 실제 동작을 바꾸는 변경은 하나뿐이다 — 기본 light가 이제 emission을 포그로 감쇠시킨다 (§43) — 그리고 `blockId`가 `blockFlags`로 전면 교체되었으므로 (§42), 배포 전에는 반드시 게임 내 컴파일로 확인할 것.

이번 개정에서 새로 추가된 **§49–§54**는 이전 자체를 넘어 프로덕션 빌드에서 복원한 엔진 내부로 들어간다 — Lite 렌더러가 실제로 훅을 호출하는 방식, 실제 4모드 포그 함수, `bloxdOpaqueBehind()`의 정확한 구현, 블록 등록에서 훅까지 이어지는 blockFlags의 완전한 전달 경로, 그리고 실측 헤더 해시가 포함된 검증 파이프라인이다. 이는 현재까지 팩 시스템에 관해 공개된 가장 깊은 사실이며, 다른 가이드가 아직 미해결로 남겨 둔 여러 질문에 답한다.

## 40. v2 팩의 운명 (먼저 결론)

**2026-10-19 업데이트: v3가 프리프로드를 떠나 이제 정식 사이트가 제공하는 버전이 되었다.** v2로 배포된 모든 팩을 포함해, 롤아웃 전에 저장된 모든 v2 팩은 아래 설명대로 프로덕션에서 실패한다. 따라서 오늘 팩을 배포하는 사람에게 §47의 이전은 더 이상 선택이 아니다.

이 빌드는 manifest의 `apiVersion`이 **3과 엄밀히 일치**할 것을 요구하며, **v2/v3 병행 지원은 없다**. v2 팩은 로드 시 「API 버전 불일치」 메시지로 거부된다 (i18n 키와 플레이스홀더 텍스트):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

저장된 팩은 v2 라이프사이클을 그대로 따른다 ([제8부](08-apiv2.md) §31): 모든 빌드는 엔진 헤더의 해시를 계산하고, 엔진 업데이트는 저장된 팩을 자동으로 「재확인 필요」로 표시하며, `apiVersion`이 현재 버전이 아닌 저장 팩은 오류를 내는 대신 실행되지 않음으로 표시된다 (위 상태 메시지가 대체 팩을 가리킨다).

## 41. pack.json과 uniform 버퍼 (변하지 않는 부분)

- 필수 manifest 필드는 그대로다: `{ apiVersion, name, author }`.
- 로더 제한도 그대로다: 32MB zip / 1024개 항목 / `.wgsl` 파일 256개 / 코드 총량 256KB / manifest 64KB.
- 엔진 uniform 블록의 형태는 그대로다: `@group(3) @binding(0)`, 64 B, 선언 순서대로 시간, 렌더 오프셋, 태양 방향, 눈 위치를 담는다. 레이아웃은 `minBindingSize: 64`로 등록되며, 정확한 필드 배치는 `seconds: f32` @ 바이트 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48이다. 내부 필드 이름 두 개가 바뀌었다: `time` → `seconds`, `originOffset` → `renderOffset`. **바이트 레이아웃은 v2와 동일**하며, 팩 코드에는 어차피 영향이 없다. 팩은 이 uniform을 직접 이름 붙일 수 없기 때문이다 (엔진 헤더가 엔진 제공·읽기 전용으로 표시하며, 「팩은 이름을 붙일 수 없다」). 계속 헤더 함수 `bloxdSeconds()` / `bloxdRenderOffset()`을 사용할 것.
- 팩의 group 3에는 문서화된 두 번째 점유자가 생겼다: `@group(3) @binding(1)`은 `bloxdOpaqueBehind()`가 읽는 씬 깊이 텍스처다 (전체 구현은 §51). 64 B uniform은 binding 0에 그대로 있으며, 팩은 여전히 어느 binding도 이름 붙일 수 없다.

## 42. blockId가 blockFlags로: 블록별 머티리얼을 비트 플래그로 (핵심)

세 훅 입력 구조체 모두에서 (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) v2 필드 `blockId: u32`가 `blockFlags: u32`로 **교체**되었다. 이 필드에 대한 엔진 설명: *「이 면이 어떤 종류의 블록인지: `bloxdBlockFlag*` 비트이며, 면 전체에서 같다.」* 이제 엔진이 머티리얼 데이터를 직접 제공하므로, 숫자 id 범위로 머티리얼을 추측하거나 월드 내 id 표를 유지하던 v2 방식 ([제8부](08-apiv2.md) §34)은 필요 없다.

비트는 이름 있는 상수로 공개된다:

```wgsl
// (blockFlags & bloxdBlockFlagRock) != 0 으로 검사한다.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 값 | 상수 | 의미 (엔진 주석 요약) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 완전히 불투명 — 나뭇잎과 얼음도 포함. 유리, 물, 용암, 스포너, 고스트·투명 블록은 제외. |
| 2 | `bloxdBlockFlagEmissive` | 네온, 포털, 램프, 용암, 비컨처럼 블록 광을 낸다. 빛나는 광석도 아무리 약해도 포함. |
| 4 | `bloxdBlockFlagVegetation` | 나뭇잎, 그리고 잔디 블록의 잔디 — 잔디 블록은 흙이기도 하다. 선인장, 버섯 블록, 건초는 제외. |
| 8 | `bloxdBlockFlagDirt` | 흙과 토양, 잔디 블록 포함. Rocky Dirt는 암석이기도 하다. |
| 16 | `bloxdBlockFlagSand` | 모래, 붉은 모래, 그리고 모든 사암 — 사암은 암석이기도 하다. |
| 32 | `bloxdBlockFlagRock` | 돌과 그 종류, 안산암, 섬록암, 화강암, 자갈, 광석, 사암, Rocky Dirt, 기반암, 흑요석, 마그마. |

여러 머티리얼로 이루어진 블록은 **각각** 일치하는 플래그를 모두 가진다 (엔진 자신의 예: 사암은 모래이자 암석이므로 둘 다 가진다). 나뭇잎은 vegetation이지만 dirt는 아니고, 잔디 블록은 vegetation과 dirt를 동시에 가진다.

vegetation / dirt / sand / rock 플래그는 블록의 등록된 **표시명**으로부터 부여된다 (opaque / emissive는 대신 엔진 자체의 불투명도·발광 데이터에서 온다): 이름이 `Leaves`로 끝나거나 `Grass Block`인 것은 vegetation; `Dirt` / `Soil` 이름 (그리고 모든 `Grass Block`)은 dirt; 정확히 `Sand`와 `Red Sand`, 그리고 `Sandstone`을 포함하는 모든 이름은 sand; `Stone` / `Andesite` / `Diorite` / `Granite`를 포함하는 이름, 모든 `Ore`, 그리고 Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (와 사암)는 rock이다.


### 정확한 이름 규칙 (모든 블록의 플래그를 직접 도출하기)

네 머티리얼 비트는 블록의 등록된 표시명에 대한 고정 분류기에서 나온다. 베리언트 이름(`|` 뒤의 모든 것)은 먼저 잘라내므로, 베리언트는 기본 블록의 플래그를 물려받는다. 그다음:

| 비트 | 규칙 (잘라낸 이름에 대해 평가) |
|---|---|
| vegetation | 이름이 ` Leaves`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| dirt | 이름이 정확히 `Dirt`이거나, ` Dirt` 또는 ` Soil`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| sand | 이름이 정확히 `Sand` 또는 `Red Sand`이거나, `Sandstone`을 **포함한다** |
| rock | 이름이 정확히 `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` 중 하나이거나, `Sandstone`을 **포함하거나**, ` Ore`로 **끝나거나**, `Stone` / `Andesite` / `Diorite` / `Granite`를 독립 단어로 포함한다 |

Yellowstone이 명시된 이유는 `Stone`이 `Yellowstone` 안에서 독립 단어가 아니기 때문이다. Opaque와 emissive는 이름에서 오지 **않는다** — 엔진 자체의 불투명도와 블록 광 방출 데이터에서 오므로, 이 규칙으로는 도출할 수 없다.

출처: 엔진의 이름 분류기 (모듈 28537, 번들 `3ymzdd`); 이름이 있는 7,861개 블록 전체에 대해 검증했다, 2026-10-20.

예 — 머티리얼별로 블록에 색을 입힌다:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 레시피에 미치는 영향: R-H의 22개 항목 나뭇잎 id 배열 ([제8부](08-apiv2.md) §34)은 `(blockFlags & bloxdBlockFlagVegetation) != 0`으로 줄어든다. [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)의 id ↔ 블록 이름 대응표는 셰이더 이외의 용도에는 여전히 유용하지만, 머티리얼 스타일링을 위해 월드 내에서 조회할 필요는 없어졌다.

### 잔디 없는 나뭇잎 (모두가 묻는 질문)

`vegetation`만 사용하면 나뭇잎**과** 잔디 블록의 잔디를 모두 일치시킨다. 잔디 블록은 `dirt`도 가지기 때문이다. dirt를 제외하면 나뭇잎만 흔들 수 있다 — 엔진의 필드 주석이 명시하는 판별식은 다음과 같다:

```wgsl
// 나뭇잎만: dirt가 없는 vegetation. 잔디 블록은 vegetation AND dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 잔디 블록만 (지형 표면의 잔디 면):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

실제 레지스트리로 확인했다 (2026-10-20, 번들 `3ymzdd`):
`vegetation && !dirt`는 정확히 45개의 나뭇잎 등록 (22개 기본 타입 —
v2 R-H id 배열이 측정한 것과 같은 22개)과 일치하고, `vegetation && dirt`는 정확히
8개의 잔디 블록과 일치한다. 어느 방향으로도 예외는 없다 — 레지스트리 집계는 해당 빌드 시점 기준이며, 새 블록이 추가되면 규칙은 그대로인 채 숫자만 늘어난다. `vertex.normal`
(위/아래)과 조합하면 면을 고를 수 있다. 예를 들어 잔디 블록의 윗면만 고른다.

## 43. 함수 이름 변경과 의미 변화

| v2 | v3 | 비고 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | 페이지 로드 후 경과 초 (f32 정밀도 주의는 아래) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 같은 양: 렌더 위치 + 이 값 = 월드 위치 |
| `const bloxdTimeWrap: f32 = 3600` | **삭제** | 주기는 팩 쪽에서 직접 정의한다 |
| `engineColour` (`BloxdLightIn` 안) | **삭제** (14 → 13 필드) | `litColour` + 포그로 다시 구성한다 |
| 훅 매개변수 `v` / `s` / `l` | `vertex` / `surface` / `light` | 템플릿 표기이며 시그니처는 그대로 |

- **`bloxdSeconds()`** — 페이지 로드 후 경과 초. f32에서는 처음 4.5시간 동안 1ms보다 작은 단위로, 9~18시간 구간에서는 약 4ms 단위로 증가한다. 헤더는 `bloxdSeconds() % period` 관용구를 권장한다. 이는 0에서 `period`까지 세다가 다시 시작하므로, 삭제된 wrap 상수를 깔끔하게 대체한다.
- **`bloxdRenderOffset()`** — 블록 단위: 「렌더 위치에 이 값을 더하면 월드 위치가 된다.」 플레이어가 이동하면 이 값도 바뀌므로 렌더 위치는 플레이어 가까이에 유지되고, 그만큼 정밀하다. 가이드 전체에서 v2 문장에서 「noa 로컬 오프셋」이라고 부르던 값은 이제 일관되게 **렌더 위치** / 렌더 오프셋이라고 부른다. `bloxdOriginOffset()`이 반환하던 것과 같은 양이다.
- **`bloxdTimeWrap` 삭제** — 3600초에서 시간을 wrap하던 팩은 이제 자체 상수를 선언한다. 예: `const timeWrap: f32 = 3600.0;` 그리고 `% timeWrap`.
- **기본 light의 의미 변화** — v2의 기본값은 `engineColour + emission × fogVisibility`였고, v3의 기본값은 `bloxdApplyFog(litColour + emission, light)`로 구성된다. **이제 기본값 안에서 emission이 포그로 감쇠**되므로, 합성된 출력 전체가 함께 포그 블렌드를 통과한다. 이전 표:

  | v2 식 | v3 이전 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2의 `l.engineColour + s.emission * l.fogVisibility`를 v3로 이전:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **이름과 의미가 그대로인 것**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. 새 헤더 상수: `bloxdPi`와 `bloxdTau`

```wgsl
// 반 바퀴와 한 바퀴, 라디안 단위.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

삼각함수 계산에 유용하고, 팩이 더 이상 π를 하드코딩할 필요도 없다. 이름 재사용에 주의할 것: 같은 이름의 팩 로컬 상수는 이제 헤더의 중복 식별자 검사와 충돌한다. 코드에서 `bloxdPi` / `bloxdTau`를 다시 선언한 부분이 있으면 삭제하거나 이름을 바꿀 것.

## 45. 6훅 템플릿 (액체 훅 공식 공개)

빌드와 함께 공개된 기본 팩 텍스트는 이제 **여섯 훅 모두**를 제공한다 — terrain / liquid × vertex / surface / light이며, 각각 엔진 기본값을 반환한다. 엔진 주석이 소개한다: *「모든 훅은 엔진 기본값을 반환한다. 훅을 복사해 출력을 바꾸면 셰이더 팩을 만들 수 있다.」*

```wgsl
// 모든 훅은 엔진 기본값을 반환한다. 훅을 복사해
// 출력을 바꾸면 셰이더 팩을 만들 수 있다.

// strict 게임은 지형을 그대로 둔다. 가드가 없으면 이 훅은
// 그런 게임에서 셰이더 팩 전체를 꺼 버린다.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// 물은 이 훅들을 사용한다. 삭제하면 물은 대신 terrain 훅을 사용한다.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- 훅 주석이 액체 규칙을 직접 말한다: **물에는 세 훅이 필요하며, 삭제하면 물은 terrain 훅을 재사용한다** (v2에서 알려진 폴백 동작이며, 이제 [제8부](08-apiv2.md) §36의 내용이 템플릿 자체에 적혀 있다).
- `bloxdLiquidVertex`는 `bloxdTerrainVertex`와 같은 `#ifndef BLOXD_STRICT` 가드 안에 있다 — 가드가 없으면 terrain 쪽 vertex 효과와 마찬가지로 strict 게임에서 팩 전체를 꺼 버린다.
- 템플릿 표기는 이제 전체 매개변수 이름 `vertex` / `surface` / `light`를 쓴다 (v2 템플릿은 짧은 `v` / `s` / `l`이었다). 자신의 코드에서 매개변수 이름은 자유이며, 시그니처만 중요하다.

## 46. 베리언트 매트릭스: 프로그램 축과 매크로 변화

베리언트는 **strict × lighting × program** 매트릭스 위에서 생성된다 — v2와 같은 8가지 조합이지만, 이제 terrain / liquid가 매트릭스의 명시적 축이다. 베리언트 이름은 `allow|strict · unlit|lit · terrain|liquid`로 이를 드러내며, UI에서는 ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off`로 표시된다 (오류 표시에는 `"(only in {{variants}})"`가 덧붙을 수 있다).

| 매크로 | 정의되는 곳 |
|---|---|
| `BLOXD_STRICT` | strict 베리언트 (두 프로그램 모두) |
| `BLOXD_LIGHTING` | lighting-on 베리언트 (두 프로그램 모두) |
| `BLOXD_ALPHA` | **모든 액체 베리언트**에 더해 non-strict **terrain** 베리언트 |
| `BLOXD_SCENE_DEPTH` | **모든 액체 베리언트** |

v2 규칙 ([제8부](08-apiv2.md) §36)과 비교해 작성자에게 바뀌는 점은 두 가지다:

- **`BLOXD_ALPHA`는 v2에서 그대로다.** 베리언트 생성기는 `"liquid"!==program&&strict||push("BLOXD_ALPHA")`라는 줄을 그대로 담고 있다 — JS 연산자 우선순위상 push를 건너뛰는 경우는 *(terrain **이면서** strict)* 하나뿐이므로, 매크로는 **모든 액체 베리언트 (strict든 non-strict든)와 non-strict terrain**에 정의되고, strict terrain만 이를 생략한다. 액체 쪽 `#ifdef BLOXD_ALPHA` 코드는 예전과 똑같이 컴파일되며, §49의 alpha 되쓰기 (liquid 프로그램이나 non-strict 베리언트에 이어 붙는다)가 이 집합과 정확히 일치한다.
- **`BLOXD_SCENE_DEPTH`는 액체 베리언트에서 항상 정의된다.** 따라서 깊이 사용은 v2와 똑같이 액체 쪽에서 가드 없이 괜찮고 (§35), terrain 훅에서는 계속 `#ifdef BLOXD_SCENE_DEPTH`로 감싸야 한다.

## 47. v2 → v3 마이그레이션 체크리스트

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`**: 세 입력 구조체 모두에서 바꾸고, 머티리얼 스타일링을 `bloxdBlockFlag*` 상수에 대한 비트 검사로 표현한다 (§42). v2의 id 범위 휴리스틱은 버린다.
3. **`bloxdTime()` → `bloxdSeconds()`**: 삭제된 `bloxdTimeWrap` 대신 자체 주기를 선언한다 (`% period`).
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **light 계산을 `engineColour`에서 `litColour` + 포그로 재구성한다**: §43 표에 따라. 기본값이 이제 emission을 포그로 감쇠시킨다는 점에 주의.
6. **액체 훅**: 물을 다르게 처리하려면 `bloxdLiquid*`를 명시적으로 정의한다. 생략하면 terrain 훅으로 폴백한다.
7. **`BLOXD_ALPHA` 점검은 필요 없다** — 베리언트 집합은 v2와 그대로다: 모든 액체 베리언트와 non-strict terrain에 정의되고, strict terrain만 생략한다 (§46)
8. **`bloxdPi` / `bloxdTau` 사용**: 삼각함수 관련 상수를 하드코딩하던 곳에서 사용하고, 이제 헤더와 중복되는 팩 로컬 재선언은 삭제한다.
9. **strict 가드 유지**: vertex 훅과 `discard`는 계속 `#ifndef BLOXD_STRICT`로 감싼다. 템플릿은 `bloxdLiquidVertex`도 terrain 쪽과 같은 방식으로 가드한다.
10. **게임 내 검증**: 셰이더 팩을 지원하는 게임에서 팩을 컴파일하고 테스트한다.

## 48. 기타 v3 변경과 주의사항

- **검증은 여전히 2단계**다 ([제8부](08-apiv2.md) §38): 먼저 정적 검증, 그 다음 훅을 호출하는 생성 스텁 스니펫을 통한 브라우저의 실제 WebGPU 컴파일. 오류는 원본 파일 / 줄로 매핑되고, 진단은 매핑을 통해 엔진 쪽 식별자의 원래 이름을 복원한다.
- **strict 진단은 이유를 말한다**: 지형을 움직이는 vertex 훅은 「… moves terrain, which strict games prevent.」를 보고하고, surface / light 훅의 `discard`는 「discard makes terrain see-through, which strict games prevent.」를 보고한다. 설정 UI는 「wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.」 안내를 유지한다 (`offInStrict`).
- **로더 메시지**: 오류 종류와 제한은 그대로다. "Zip64 archives aren't supported."는 UI 메시지로 표시된다 (`loadZip64`). 팩 UI 문자열 인벤토리는 총 57개의 `shaderPack:*` 키다. 로드 단계 오류로는 `.wgsl` 파일이 하나도 없는 zip을 뜻하는 `loadNoWgsl`과 zip 종료 시그니처가 없는 파일을 뜻하는 `loadNotZip`이 이 집합을 마무리한다.
- **게임 내 WGSL 에디터는 팩 UI에 포함되지 않는다.** 설정 화면에는 셰이더 코드 에디터가 없다 — 팩은 게임 밖에서 zip 파일로 작성한다. (번들 안에 CodeMirror 에디터가 존재하기는 하지만, 그것은 커스텀 게임 스크립팅 UI의 JavaScript 에디터이며 WGSL 지원도, 팩 시스템과의 연결도 없다.)
- **하드웨어 게이트**: Lite는 `shader-f16` WebGPU 기능을 지원하는 드라이버를 요구한다. 너무 오래된 드라이버는 "Intel driver too old for Lite (no shader-f16)" 같은 메시지로 거부된다.
- **lighting 변경은 저장된 팩을 재검증한다**: 실행 중 lighting 설정이 바뀌면 엔진은 팩 검사를 다시 실행한다 (`changed → recheck`); 리플레이 시청은 같은 훅을 `changed: false`로 호출하고 재검사를 건너뛴다.
- **문구**: 셰이더 팩을 받아들이는 게임에 대한 문장이 이제 「in games that **support** them」으로 표기된다.
- **적용 범위**: 팩이 동작하는 게임의 범위는 이전 빌드와 같다.

## 49. 엔진 내부: Lite 렌더러가 훅을 호출하는 방식

§40–§48은 로더와 헤더가 알려 주는 내용이다. 이 절과 뒤따르는 절들은 엔진이 실행 시 실제로 하는 일을 프로덕션 번들에서 복원해 기록한다 (Lite 렌더러는 175 KB 청크이며, 통합 소스 파일의 실제 이름 `lite/terrainShaderPack.ts`가 오류 문자열 안에 남아 있다). 이 중 어느 것도 작성하는 코드를 바꾸지는 않지만, 훅이 무엇을 받는지에 대한 추측을 없애고, 다른 커뮤니티 가이드가 아직 미해결로 남겨 둔 여러 질문을 정리한다.

렌더러는 JavaScript에서 훅을 「호출」하지 않는다. 팩이 검증을 통과하면 엔진은 셰이더 텍스트의 고정 앵커 줄을 교체해 **훅 호출을 자체 terrain WGSL에 이어 붙인다**. 앵커는 정확히 한 번만 일치해야 한다 — 0회 또는 여러 회 일치하면 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`로 중단한다.

| 단계 | 엔진 셰이더의 앵커 줄 | 이어 붙는 내용 |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);`부터 `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);`까지의 네 줄 블록 | `BloxdVertexIn`을 만들고 vertex 훅을 호출한 뒤 `worldPos`를 다시 쓴다 — 이어 붙이기는 `let worldPos`를 `var worldPos`로도 바꾼다 |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn`을 만들고 surface 훅을 호출한 뒤 `baseColor` / `alpha`를 다시 쓴다 |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` 바로 앞 | `let bloxdSpLitColour = color.rgb;` — 포그 전 색을 캡처한다 |
| light | fragment 셰이더의 마지막 `return color;` 줄 | `BloxdLightIn`을 만들고 light 훅을 호출한 뒤 `color`를 다시 쓴다 — 포그 블렌드 이후 |

출하된 번들에서 복원한, 훅을 이어 붙이는 코드 (엔진 자체 서식이 길어지는 light-level 샘플 식은 축약):

```wgsl
// vertex 단계 — vertex 훅을 가진 non-strict 베리언트
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment 단계 — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 프로그램이 liquid이거나 베리언트가 non-strict일 때만 이어 붙는다
```

```wgsl
// fragment 단계 — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* light-level varying */.rgb,           // blockLight
        /* sky channel of the same varying */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* held-light term (see below) */,       // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — 포그가 전혀 없을 때만 검정
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

이 이어 붙이는 코드에서 곧바로 나오는 네 가지 강제 사실:

- **strict terrain은 surface 훅의 alpha 변경을 무시한다.** `alpha = bloxdSpSurface.alpha` 되쓰기는 liquid 프로그램이나 non-strict 베리언트에만 이어 붙는다 — §46 매크로 표의 구현이다. (strict terrain에서는 `#ifdef BLOXD_ALPHA` 코드가 어차피 컴파일 대상에서 빠지며, 이제 가드 없는 alpha 쓰기도 거기서 버려진다는 점이 확인되었다.)
- **vertex 훅을 선언한 strict 베리언트는 그 훅을 절대 실행하지 않는다** — 엔진은 빌드 시점에 `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`를 보고한다. 공식 템플릿 (§45)이 `bloxdLiquidVertex`를 terrain 쪽과 같은 `#ifndef BLOXD_STRICT`로 감싸는 이유다.
- `bloxdSp*` 식별자 — **총 14개**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — 는 엔진 쪽 임시 변수다. 작성하는 코드에는 보이지 않지만 진단과 누군가의 리버스 엔지니어링 출력에 나타나므로, 보는 즉시 알아볼 가치가 있다.
- **기본 surface 지름길.** 베리언트의 surface 훅이 문자 그대로 `bloxdDefaultSurface`이면, 엔진은 `baseColor` / `alpha` 되쓰기 줄을 아예 이어 붙이지 않는다 — 기본값이 이미 그 값들을 만들어 내므로 대입은 죽은 코드가 된다. 수정하지 않은 훅 체인은 비용이 들지 않는다.

**`BloxdLightIn`에 실제로 들어가는 값** — 이어 붙는 코드 기준, 필드별:

| 필드 | 엔진 쪽 공급원 |
|---|---|
| `litColour` | 포그 블렌드 직전에 캡처한 프래그먼트 색 (`bloxdSpLitColour` 앵커) — 헤더가 말하는 「emission과 포그 전」 |
| `directional` | `vTerrainLambert` — 씬의 방향광에 대한 `max(0, dot(normal, lightDirection)) × intensity` 합을 vertex에서 보간한 값 (식은 §54); 씬에 방향광이 없으면 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — 머티리얼별, 프레임별 |
| `blockLight` | 디코드된 light-level varying의 `.rgb` (디코드는 §54) |
| `skyLight` | 같은 light-level varying의 스카이 채널 — *「Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING」* (헤더 텍스트) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | light-level varying의 w 채널과 프레임 uniform `uHeldLightPos` / `uHeldLightColour`로 만든 held-light 항 ([제7부](07-internals.md) §26이 감쇠와 채널 하한 동작을 기록한다) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **포그가 전혀 없는 씬에서만 검정** (모드 0, §50) |
| `fogVisibility` | 클램프된 포그 계수 — §50 함수가 반환하는 정확한 값 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying (normal은 프래그먼트마다 다시 정규화) |
| `blockFlags` | `vBlockFlags` flat varying — §52의 전체 전달 경로 |

오래된 자료를 읽을 때 방향을 잡기 위해: 동일한 이어 붙이기 구조는 v2 렌더러에도 있었고, v3의 통합 차이는 `vBlockId` → `vBlockFlags`와 액체 베리언트 추가뿐이다. 훅 시스템은 v2 → v3 단절을 거쳐도 구조적으로 안정적이다.

## 50. 포그 함수: 네 가지 모드, 하나의 필드

프로덕션 terrain 셰이더에서 그대로 복원:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // 선형
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // 지수
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // 지수 제곱
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = 포그 꺼짐 (계수는 1.0 유지)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — 하나의 vec4가 모든 것을 구동한다.
- **셰이더에는 네 가지 모드가 있다: 0 = 꺼짐, 1 = 지수, 2 = 지수 제곱, 3 = 선형.** 어느 모드가 실행되든 `fogVisibility`는 클램프된 계수다 — 필드는 정확히 하나뿐이고, 모드 플래그는 팩에 노출되지 않는다.
- Bloxd 자체 타이틀은 [제7부](07-internals.md) §25에 설명된 32블록 대역으로 모드 3 (선형)을 구동하므로 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), 그 부의 「항상 선형」 관찰은 여전히 출하된 게임플레이를 설명한다. 그러나 지수 모드도 실제로 살아 있는 엔진 코드다 — 타이틀은 클라이언트 업데이트 없이 `vFogInfos.x`를 바꿔 램프를 바꿀 수 있다. 거리 기반 레시피에서 `distance(l.position, bloxdEyePosition())`를 직접 계산하는 방식 (레시피 R-B)은 모드 전환에 영향을 받지 않으므로 거리 기반 외형을 쓰는 견고한 방법이다.
- 이로써 「엔진이 실제로 어느 포그 램프를 쓰는가」라는 질문이 소스로 정리된다: 네 가지가 모두 구현되어 있고, 출하된 타이틀은 선형을 쓴다. (같은 함수가 헤더의 fogColour 주석도 설명한다 — 모드 0은 `fogColour`가 검정으로 도착하는 유일한 경우이며, Bloxd 게임은 모드 0을 출하하지 않고 대신 포그를 멀리 밀어낸다, [제7부](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): 정확한 구현

프로덕션 빌드에서 그대로 복원한 함수 전체:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **깊이 텍스처는 `@group(3) @binding(1)`에 있다** — group 3은 팩 자신의 그룹이다: binding 0은 64 B `bloxdPackInputs` uniform (§41), binding 1은 이 깊이 텍스처다. 둘 다 엔진이 제공하며 팩 쪽에서는 이름을 붙일 수 없다.
- **깊이 텍스처는 unfilterable-float, fragment 전용 리소스다.** 바인드 그룹 레이아웃은 이를 `texture: { sampleType: "unfilterable-float" }`로 등록하며 가시성은 `GPUShaderStage.FRAGMENT`뿐이다 — `bloxdOpaqueBehind()`가 `textureSample` 대신 `textureLoad` (명시적 텍셀 좌표, 밉 레벨 0)로 구현된 이유가 바로 이것이다: 이 텍스처에는 하드웨어 필터링이 아예 없다.
- `z ≤ 0`은 깊이 샘플이 아무것도 맞히지 못했다는 뜻이다 (원거리 평면 / 하늘): `found = false`이며 `position` / `distance`는 의미가 없다 — 항상 `found`를 먼저 확인할 것.
- 반환되는 위치는 **광선 스케일 교차점**이다: 불투명 표면은 `eye + (fragment − eye) × max(z / viewDepth, 1)`에 놓인다. `distance`는 눈에서 그 점까지의 거리다 — 물 표면 팩에서는 「광선이 단단한 표면에 닿기 전에 물을 얼마나 통과했는가」가 되며, 이것이 두 번째 깊이 버퍼 없이 깊이 틴트 물 레시피를 가능하게 한다.

## 52. blockFlags 전달 경로: 등록에서 훅까지

§42는 비트의 의미를 설명한다. 이 절은 플래그 비트가 블록 등록에서 훅까지 이동하는 완전한 경로다 — 모든 단계는 프로덕션 소스에서 확인했으며, 헤더의 「면 전체에서 같다」가 바이트 수준에서도 성립함을 증명한다.

**1. 등록 (블록 정의 데이터베이스).** 각 블록의 플래그는 등록 시 한 번 계산된다:

```js
flags[id] = nameFlags                     // 표시명 규칙 (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // 불투명 비트 — 엔진 불투명도 데이터
          | (anyFaceEmission >= 1       ? 2 : 0);  // 발광 비트 — 블록 광 방출 데이터
```

표시명 규칙은 네 가지 머티리얼 비트만 담당하고, 두 물리 비트는 별도 엔진 데이터에서 온다 — `opaque`는 블록 정의에서 곧바로, `emissive`는 면별 블록 광 방출 배열에서 온다. 헤더의 「빛나는 광석도 아무리 약해도 포함」은 문자 그대로다: 방출이 1 이상인 면이 있으면 비트가 설정된다.

**2. 블록별 → 머티리얼별 (메셔 초기화).** 지형은 블록 id가 아니라 *머티리얼* 단위로 그려지므로, 플래그는 머티리얼 표로 다시 정리된다 (머티리얼 id로 인덱스하는 `Uint16Array`이며, 각 머티리얼은 소유 블록의 첫 면 플래그를 가진다). 이 표는 메싱 Web Worker로 전달되지만 — **팩 파이프라인이 활성화된 구성에서만** 그렇다. 그 외에는 표가 `null`이고 플래그 바이트가 전혀 기록되지 않는다. 팩이 없는 플레이어는 구조적으로 오버헤드가 0이다.

**3. 정점 바이트로 (메셔 워커).** 플래그는 기존 인터리브 정점 데이터의 여유 바이트 두 개를 탄다:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 하위 8비트 → color 속성의 alpha 바이트
        buffer[o + normalOffset + 3] = flags >> 8;    // 상위 8비트 → normal 속성의 w 바이트
    }
}
```

면의 네 정점 모두 같은 값을 받는다 — 「면 전체에서 같다」의 구현 수준 의미다.

**4. GPU 쪽 디코드 (Lite terrain 셰이더).** 두 바이트는 `blockFlagWords: vec2u` 정점 속성 (location 7, 팩 파이프라인이 켜졌을 때만 존재)으로 이동하고 vertex 단계에서 재조립된다:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags`는 `@interpolate(flat)`으로 선언된다 — 면마다 일정한 값이 fragment 단계까지 이어지므로, §42의 비트 검사가 면 안에서 안정적이고 면 중간 블렌드가 생길 수 없다.

- 파이프라인은 **16비트** 용량을 예약하지만 (위 디코드는 두 바이트 전체를 재조립한다) v3는 6비트만 정의한다 — 향후 플래그가 정점 형식 변경이나 API 범프 없이 등장할 수 있다.
- packed-vertex 모드에서는 같은 두 바이트가 전용 속성 대신 `packed.y`와 color 워드의 상위 바이트 안에 들어간다 — 값은 같고 컨테이너만 다르다.
- 이 플래그에 가장 자주 묻는 나뭇잎 대 잔디 질문은 §42 아래의 [잔디 없는 나뭇잎](#잔디-없는-나뭇잎-모두가-묻는-질문)을 참조.

## 53. 검증 내부: HEADER_VERSION, 서명, 예약 이름

**실측 헤더 해시.** 모든 팩 검증에는 엔진의 `HEADER_VERSION`이 찍힌다. 프로덕션 검증 모듈을 직접 실행하면 (§54 끝의 하네스 주석 참조) 다음과 같이 측정된다:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 라이브 프로덕션 번들에서 측정
```

FNV-1a-32 해시이며 (`6.` 접두사), 다섯 입력을 해시한다: 베리언트별로 전처리·토큰화한 엔진 헤더 (8개 베리언트 각각 한 항목), 파서의 전체 WGSL 어휘 우주, 네 매크로 이름, 특수 함수 맵, 그리고 `BloxdPackInputs` 선언과 그 `@group(3) @binding(0)` uniform 줄. 작성자에게 중요한 두 가지 결과:

- **엔진 쪽 헤더가 바뀌면 해시도 바뀐다** — 엔진 업데이트 후 저장 팩이 받는 자동 「재확인 필요」 플래그의 메커니즘이다 ([제8부](08-apiv2.md) §31).
- 해시는 *엔진 헤더*를 덮으며 작성하는 코드는 덮지 않는다. 엔진 업데이트를 넘겨 계속 로드되는 팩이 「여전히 유효」한 것은 아니다 — 아직 헤더 변경에 걸리지 않았을 뿐이다. manifest가 참여하는 유일한 버전 검사는 `apiVersion` 게이트다 (§40).

**훅 시그니처 검사: 타입은 토큰 단위로 엄밀, 이름은 자유.** 검증기는 훅 슬롯마다 시그니처 하나를 가진다:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

일치는 **토큰 단위**다: 매개변수 타입 이름이 정확히 일치해야 하고, `->`와 반환 타입도 정확히 일치해야 하며, 매개변수 개수와 쉼표 위치도 검사한다. 매개변수 *이름*은 자유다 — 매개변수 자리에 어떤 식별자든 허용되므로, 템플릿이 `(surface, light)`라고 써도 `fn bloxdTerrainLight(s, l)`이 컴파일된다. light 훅은 정확히 매개변수 두 개를 받는다.

**예약 이름.** 규칙은 정규식 하나다: `/^bloxd/i`. `bloxd`로 시작하는 모든 식별자는 예약된다 — `bloxd*`는 모두 엔진 제공이며, 팩은 그 네임스페이스에 선언할 수 없다 (그래서 §44의 `bloxdPi` / `bloxdTau` 재선언이 충돌한다).

**특수 함수.** v3에는 정확히 하나가 등록되어 있다:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「특수」는 *매크로에 묶였다*는 뜻이다 — 가용성이 베리언트 심볼에 달린 엔진 함수다. 올바른 사용을 강제하는 가드 진단은 두 가지다:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex 훅이 surface/light 전용 함수에 닿은 경우.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — 예를 들어 `#ifdef BLOXD_SCENE_DEPTH`로 감싸지 않은 terrain 쪽 `bloxdOpaqueBehind()`.

**엔진 헤더 (프렐류드), 고정.** v3 헤더는 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`로 시작하는 5,637바이트 문자열이다. 엔진 자체 WGSL 전처리기가 베리언트별로 평가하는 `#if` / `#ifdef` 지시문을 담는다 — 엔진은 실제로 `#if` 식 평가를 실행하며, 잘못된 식은 `Cannot evaluate #if ...`로 오류를 낸다. 이 가이드의 모든 구조체, 함수 시그니처, 인용 주석은 이 렌더링된 텍스트에서 나왔으므로, 가이드와 출하 헤더가 어긋날 수 없다.

**작성자를 위한 파서 주의사항.**

- 팩 쪽 함수는 엔진 셰이더에 병합될 때 `pack_` 접두사로 이름이 바뀐다 (충돌 회피). 진단은 이를 원래 이름으로 되돌린다 — [제8부](08-apiv2.md) §38이 설명하는 제2 검증 단계와 같은 메커니즘이다.
- 미선언 식별자 메시지는 `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`다. `_ can only be the target of a phony assignment, as in _ = f();`와 `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.`가 새로 확인된 메시지 집합을 이룬다.
- 파서의 어휘 우주에는 **표준 WGSL이 아닌** 식별자도 들어 있다: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. 엔진은 이를 내장으로 알지만, 특정 브라우저의 WGSL 구현이 이를 제공한다고 보장할 수 없다 — 배포용 팩을 이것들에 기대어 만들지 말 것.

## 54. 확인된 상수, 제한, 레이아웃

프로덕션 Lite 렌더러에서 그대로 가져온 terrain 프로그램의 전체 리소스 레이아웃:

| Binding | 내용 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = 렌더 프레임으로의 평행 이동, w = 페이드인 가시성 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — 팩 uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — 깊이 텍스처 (§51) |

- **방향광은 최대 네 개로 하드 캡된다.** 씬이 더 등록하려 하면 렌더러는 `Terrain supports 4 directional lights, not ${n}`으로 오류를 낸다. `l.directional`은 존재하는 만큼 (0–4개, Bloxd 자체 씬은 2개 사용 — [제7부](07-internals.md) §27)의 Lambert 합이다. terrain은 또한 처리할 수 없는 light에 대해 다음과 같이 경고한다, 그대로 옮기면: 늦게 추가된 light — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; 색이 입혀진 light — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; 메시 필터링 light — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **terrain 프로그램 이름**: 파이프라인 캐시 키는 `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}`로 읽힌다 — 팩은 `-sp{variant}` 접미사로 나타나며, §46 베리언트마다 프로그램 하나다. 감시자 (`watchPipelineFailures`)는 살아 있는 파이프라인 이름을 `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/`와 대조해 파이프라인 컴파일이 실패하면 일치하는 팩 베리언트를 다시 검사한다; GPU 장치 손실 (`device.lost`)은 검사를 건너뛴다.
- **`BLOXD_TERRAIN_DIRECTIONAL`은 엔진 내부 매크로**다 (dirLightCount > 0일 때 정의). 프렐류드의 네 매크로 중 하나가 아니며 팩 코드에 절대 도달하지 않지만, 엔진 자체 셰이더의 WGSL 덤프에는 나타나므로 알아 두면 혼동을 줄일 수 있다.
- **light-level 디코드**: `aPackedLightLevels` 정점 속성은 니블 네 개를 담은 f32 하나이며, 각각 15로 나뉜다: rgb = 유색 블록 광, a = 스카이 / held 채널. vertex 단계는 이를 `vLightLevels` varying으로 디코드하고, `blockLight`는 `.rgb`를, 스카이 / held 채널은 `.w`를 읽는다. 엔진은 보간 전에 rgb 채널을 가장 밝은 채널의 35%로 바닥 처리한다 — [제7부](07-internals.md) §26이 게임플레이에서 기록한 리프트의 엔진 쪽 기준점이다.
- **`vTerrainLambert`** (`directional`의 공급원, §49)는 활성 방향광에 대한 합으로 생성된다: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, `BLOXD_TERRAIN_DIRECTIONAL`로 가드된다.
- **인덱스 버퍼는 첫 대형 메시에서 32비트가 된다.** Lite 렌더러는 모든 인덱스 값이 65,534 이하로 유지되는 동안만 `Uint16Array` 인덱스를 고른다 — 어떤 인덱스든 65,535에 도달하는 순간 버퍼는 `Uint32Array`가 된다 (버퍼마다 `is32Bits` 플래그로 추적한다). 실제로는: 정점이 최대 65,535개인 청크 메시는 16비트 인덱스에 들어가고, 정확히 65,536개인 메시는 반드시 인덱스 65,535를 내보내 버퍼 전체가 32비트로 전환된다.
- **manifest 로딩 세부**: `__MACOSX/` 아래 zip 항목, `._` 접두사 파일, `.DS_Store`는 필터링된다 (macOS 아카이브 노이즈). `pack.json`은 소문자 경로 비교로 찾는다 — 0개 일치 → `loadNoManifest`, 2개 이상 → `loadDuplicateManifest`; manifest 읽기는 65,536바이트로 제한된다.
- **이 모든 것을 어떻게 검증했는가**: 프로덕션 번들의 모듈을 복원하고 (165개 청크; 이 번들의 webpack 레지스트리는 4,951개 모듈을 세지만 — 비동기 자식 의존성을 포함하는지에 따라 모듈 수는 몇 개씩 달라지므로 정확한 숫자는 번들별로 다루는 것이 좋다) Node.js의 webpack 호환 하네스에서 실행했다. 측정된 `HEADER_VERSION` (§53), 렌더링된 5,637바이트 헤더, 베리언트 표의 정규 순서, 특수 함수 맵은 모두 문자열을 읽은 것이 아니라 *출하된 코드를 실행*해 얻은 것이다. 같은 하네스는 커뮤니티 `pack_check` v6의 자연스러운 핵심이다 — 엔진 자체 검증기를 팩에 대해 실행하면 판정을 정확히 재현한다.

---

조사: ltf_ahel (glm 을 사용해 조사)

[← 이전 부](08-apiv2.md)·[매뉴얼로 돌아가기](README.md)
