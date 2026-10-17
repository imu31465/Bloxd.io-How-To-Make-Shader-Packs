[← 이전 부](07-internals.md)·[매뉴얼로 돌아가기](README.md)

# 제8부: API Version 2 마이그레이션 가이드

대상 빌드: `6qxffk.main.5912a15f.js` (2026-10-16 시점의 정식 배포). 이 책의 제1부~제7부는 v2 기준으로 다시 쓴 상태이며, 이 제8부는 v1에서의 이전 포인트와 v2의 새로운 기능을 모은 것이다. 새 기능의 코드 예제는 v2 컴파일러에 의한 8/8 베리언트 검증과 브라우저 WGSL 컴파일러 (Tint) 검증 (§38)을 통과한 것이며, 기존 레시피의 v2 변환은 기계적인 식별자 교체이므로, 배포 전에는 반드시 실기 컴파일로 확인할 것.

## 31. v1 팩의 운명 (먼저 결론)

게임은 manifest의 `apiVersion` 이 **2와 엄밀히 일치할 것**을 요구한다. v1 팩을 읽히면 `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n 키 `shaderPack:loadWrongApiVersion`) 로 거부된다. v1/v2 **병행 지원은 존재하지 않는다**. 또 엔진은 저장된 팩의 `validation.headerVersion` (헤더 전체의 해시) 을 재검사하므로, 엔진 업데이트 때 저장 팩이 자동으로 「재확인 필요」 가 되는 구조는 v1과 같다.

## 32. 식별자의 전면 개명 (대응표)

v2에서는 언더스코어 명명에서 캐멜케이스로 통일됐다. **구명은 일절 쓸 수 없다.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (내부 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

훅의 종류 (vertex / surface / light · terrain / liquid 6종) 와 `pack.json` 형식 (`apiVersion` / `name` / `author`) 에는 변경이 없다. 로더 제한도 불변 (zip 32MB / 엔트리 1024 / `.wgsl` 256개 / 합계 256KB / manifest 64KB).

## 33. 삭제 필드의 이식처

v1에서는 `time` / `eyePosition` / `sunDirection` / `originOffset` 이 구조체의 필드였다. v2에서는 **이들 필드는 삭제되고, 대신 엔진 uniform (`bloxdPackInputs`) 을 읽는 헤더 함수**를 쓴다. 함수는 uniform을 직접 읽으므로, **훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` 에 의한 월드 좌표화 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 새 기능 ①: `blockId` (블록 고유 셰이딩)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 3개 구조체 모두에 `blockId: u32` 가 추가됐다. **면이 속한 블록의 ID** (0~65535) 로, 같은 면 안에서는 일정 (`@interpolate(flat)` 으로 전달). 텍스처 색에 의존하지 않는 블록 종류 식별에 쓴다. 단 ID와 블록 종류의 대응표는 엔진 내부에 있어 팩에서는 참조할 수 없으므로, **어느 ID가 무슨 블록인지는 월드 안에서 실측하거나 아래의 참고 자료로 확인**한다.

**참고**: 필자가 게임 내 엔트리 목록을 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)에 공개했다 (`entries.json`: id ↔ 블록 이름 대응표. `Furnace|meta|rot2` 같은 회전/meta 변종도 별개 ID로 수록). 대응은 게임 업데이트로 바뀔 수 있으므로 최종 확정은 실기기에서 확인할 것.

### R-F. blockId에 의한 블록 종류 틴트

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 예: 돌 계열 (id 상위 비트 패턴) 을 한색으로 기울이기
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. 새 기능 ②: `BLOXD_SCENE_DEPTH` 와 `bloxdOpaqueBehind()` (본명)

v1에서 구조적으로 불가능했던 깊이 액세스가 **액체 (liquid) 프로그램에 한해** 풀렸다. 색은 얻을 수 없지만, **안쪽 불투명면까지의 거리와 위치라는 기하 정보를 얻을 수 있다**. 전형적인 용법은 물의 두께를 잰 흡수색 계산이다.

사용 규칙:

| 용법 | 결과 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 안에서 가드 없이 호출 | OK (액체 베리언트에서는 항상 정의) |
| `bloxdTerrainSurface` 안에서 가드 없이 호출 | ERROR. `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| vertex 훅 안에서 호출 | ERROR (surface / light 훅 한정) |

지형 훅에서도 깊이를 쓰고 싶으면 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 (지형 훅은 액체 프로그램에도 함께 쓰이므로, 액체 측에서만 깊이가 유효해진다).

### R-E. 물의 두께 흡수 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 물기둥의 길이 = 현재 위치에서 안쪽 불투명면까지
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 흡수: 빨강은 빨리 떨어지고, 파랑은 멀리까지 닿는다
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 안쪽이 하늘 = 깊은 물색으로 기울이기
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

응용: 두께 기반 흡수·산란, `behind.position` 에서의 바닥 월드 좌표에 의한 물결·코스틱풍 무늬 투영, `found=false` 에서의 하늘과 가림 구별에 의한 수면의 하늘 반사, 깊이에 의한 거품과 탁함의 단계 부여. 참고로 깊이 복사 파이프라인 구축에 실패한 경우는 「안쪽에 아무것도 없음」 으로 안전하게 열화된다.

## 36. 그 밖의 v2 변경점

- **훅의 폴백**: 액체 프로그램은 `bloxdLiquidXxx` 가 미정의일 때 지형 훅으로 폴백한다. **지형 훅뿐인 팩은 수면에도 그대로 통한다**. 의도하지 않으면 liquid 측 훅을 명시 정의한다.
- **`BLOXD_LIGHTING` 의 필드 가드는 불필요하게**: 전 베리언트에 `blockLight` 등이 존재하며, 조명off에서는 기본값 (0 / 1 / 흰색 / 0) 이 들어간다. 조명 판정을 하고 싶을 때만 `#ifdef BLOXD_LIGHTING` 을 쓴다. 기존 가드를 남겨도 동작은 바뀌지 않는다.
- **`BLOXD_ALPHA` 의 정의 조건이 변화**: 비 strict 지형 베리언트와 전 액체 베리언트에서 정의되며, strict · terrain에서는 정의되지 않는다. 지형 훅에서 alpha를 쓸 경우는 가드를 남길 것.
- **구조체의 직접 구축은 금지**: `BloxdLight(...)` 등의 생성자 호출은 정적 검증에서 거부된다. 반드시 `bloxdDefault*` 에서 변경하거나, 입력의 복사를 쓴다.
- **`let _ =` 는 `_ =` 로**: WGSL의 파기 대입 `_ = f();` 는 유효하지만 `let _ = f();` 는 거부된다.
- **offInStrict**: vertex 훅의 정의, 또는 surface / light 훅에서 도달 가능한 `discard` 가 있으면, 에러가 아니라 팩 전체가 strict 게임에서 자동 비활성화된다 (설정 UI에 `shaderPack:offInStrict` 표시, allow 게임에서는 동작). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다.
- **포그의 확장**: 포그 계산에 LINEAR / EXP / EXP2 3가지 모드가 구현됐지만, 게임 측 설정은 종래대로 항상 LINEAR이므로, 기존 포그 사양은 그대로 쓸 수 있다. `fogColour` 의 의미도 공식적으로 명문화됐다 (완전히 포그 없는 씬에서만 흑).
- **바뀌지 않은 것**: 리프트 곡선·35% 채널 바닥·heldLight 감쇠 (`pow(lightDist, 0.75)`) 와 환경광 부스트·태양과 달의 방향 사양·기존 포그색·time 감김 (3600초)·방향광 (최대 4개)·Lite (WebGPU) 전용·저장 구조 (IndexedDB)·`mod` 예약어.

## 37. v1 → v2 이전 체크리스트

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **식별자**: §32 대응표로 전부 교체 (훅명·구조체명·default 함수명)
3. **삭제 필드의 이식**: §33 표에 따라 헤더 함수로 (`s.time` → `bloxdTime()` 등)
4. **`fogFactor` → `fogVisibility`** 로 개명
5. **구조체 직접 구축을 제거**
6. **`let _ =` 을 `_ =` 로** 수정
7. **vertex 훅과 discard는 `#ifndef BLOXD_STRICT` 로 감싼다**
8. **수면도 지형 훅의 효과를 받음**을 확인하고, 의도하지 않으면 liquid 훅을 명시 정의
9. (임의) `litColour` 를 기점으로 포그를 직접 관리 / `bloxdOpaqueBehind()` 로 물의 두께 흡수를 추가 / `blockId` 로 블록 고유 표현
10. **제2단계 (브라우저 Tint) 도 검증한다** — 특히 `^` `&` `|` `<<` `>>` 를 포함한 식의 괄호. 정적 검증을 통과해도 브라우저에서 거부되는 코드가 존재한다 (§38)

## 38. 제2검증단계 — 브라우저의 WGSL 컴파일러는 내장 파서보다 엄격하다

게임의 팩 검증은 **2단계**가 있다. 제1단계는 정적 검증 (엔진 내장 JS 파서. 훅 서명·금지 구문·sceneDepth 이용 등 팩 고유 규칙을 검사) 이며, 제2단계는 브라우저 검증 (컴파일 결과에 동봉되는 스텁을 진짜 WebGPU 구현으로 컴파일하고, 에러를 팩의 원본 파일 행으로 역매핑해 표시한다. UI의 「Saved, but it won't run until you fix these errors」가 이 단계) 이다. 에러 표시 말미의 `(only in terrain)` 등의 접미사는 「그 에러가 난 베리언트의 program 종」이다.

내장 파서는 WGSL의 연산자 결합 (Binding) 규칙을 구현하지 않아, **정적 검증을 통과해도 브라우저에서 거부된다**. 피해가 나기 쉬운 것은 정수 해시의 정석 패턴이다:

| 연산자 | 결과 |
|---|---|
| `<<` `>>` | 단항 레벨까지만 직접 결합할 수 없다. `a + b << c` 는 에러 |
| `&` `^` `\|` | 단항 레벨까지만 직접 결합할 수 없다. `a * b ^ c` 는 에러 |
| `&&` `\|\|` | 혼합 불가. `a && b \|\| c` 는 에러 |

### 괄호 다는 법 (NG / OK)

```wgsl
// NG — 정적 검증은 통과하지만 브라우저 (Tint) 가 거부:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 각 곱셈을 묶는다 (같은 연산자의 연속 A ^ B ^ C 자체는 좌결합으로 합법)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

이 책의 게재 코드는 이 패턴을 포함하지 않는다 (`pack_hash3` 의 `+`/`*` 혼재와 `h ^ (h >> 16u)` 는 괄호 처리되어 있어 사양 적합). 팩을 쓰면 제1단계와 제2단계를 둘 다 통과시킬 것.

## 39. 독립적인 유사 자료에 대하여

내용이 거의 같은 커뮤니티 자료가 존재한다: [GlitchHunterCoder/Bloxd-Essay 의 Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). 이 가이드보다 먼저 공개되었지만, **이 가이드 내용은 glm 이 Bloxd 의 실제 번들 파일 (webpack 청크 묶음) 을 독자 해석한 것으로 — 베끼기가 아니다**. 둘이 일치하는 것은, 같은 구현을 독자 조사하면 같은 결론에 이르기 때문이다.

---

조사: ltf_ahel (glm 을 사용해 조사)
