# 팩 형식

> 대상 API: 5 · 대상 빌드: `v98qt8` (2026-11-08, 프로덕션·preprod 확인) · 상태: Verified (라이브 로더에서 재실측)

매니페스트, 로더 제한, 프레임별 uniform — 팩 모델 전체를 한 페이지에 담는다. 단계별 버전은 [시작하기](../getting-started/manifest.md) 에 있다.

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| 필드 | 형 | 필수 | 설명 |
|---|---|---|---|
| `apiVersion` | number | 필수 | **`5` 와 엄밀히 같아야 한다** (`===`). 문자열 `"5"` 는 실패하며, JSON 철자 그대로 보고된다 |
| `name` | string | 필수 | 트림 후 비어 있지 않을 것. 설정 화면에 표시된다 |
| `author` | string | 선택 | 있으면 string 이어야 한다 |

매니페스트의 나머지는 모두 무시된다. `pack.json` 은 zip 루트에 정확히 하나의 JSON 객체여야 한다.

## 로더 제한 (라이브 c53 에서 재실측)

| 제한 | 값 | 초과 시 메시지 |
|---|---|---|
| 팩당 `.wgsl` 파일 수 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` 소스 총량 | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` 크기 | 64 KB | `pack.json is over 64 KB.` |
| zip 크기 | 32 MB | `The zip is over 32 MB.` |
| zip 엔트리 수 | 1,024 | `The zip has more than 1024 entries.` |
| zip 형태 | — | 분할 zip / zip64 / 암호화 / 미지원 압축은 각각 전용 메시지로 거부. 모든 파일은 유효한 UTF-8. `pack.json` 은 정확히 하나. 중복 경로 금지 |

## API 버전 검사

로더는 `manifest.apiVersion !== 5` 를 JavaScript 엄격 `!==` 로 비교한다. 버전 상수 `5` 와 헤더 템플릿은 같은 모듈 (c55 / 모듈 29836) 에 있으므로, 검증과 검증이 전제하는 헤더는 함께 움직인다. 불일치 메시지: [호환성](compatibility.md) 참조.

## 프레임별 uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — 여전히 64 바이트. 다만 v5 에서 멤버가 하나 늘었다 (라이브 uniform-레이아웃 모듈에서):

| 오프셋 | 필드 | 형 | 비고 |
|---|---|---|---|
| 0 | `seconds` | `f32` | `bloxdSeconds()` 의 기반 |
| 4 | `lit` | `u32` | 블록/하늘 라이팅이 켜져 있으면 1. `bloxdLit()` 의 기반 |
| 16 | `renderOffset` | `vec3i` | `bloxdRenderOffset()` 의 기반 |
| 32 | `sunDirection` | `vec3f` | `bloxdSunDirection()` 의 기반 |
| 48 | `eyePosition` | `vec3f` | `bloxdEyePosition()` 의 기반 |

`lit` 은 v4 부터 있던 `seconds` 와 `renderOffset` 사이의 패딩에 들어갔다 (오프셋 4–15 는 정렬 틈이었고, `vec3i` 는 16바이트 정렬이 필요해 `renderOffset` 은 16 그대로다). 총 크기와 다른 모든 오프셋은 불변. 엔진은 `setUint32(4, lit ? 1 : 0)` 한 번으로 쓴다 — 라이트 레벨이 아니라 플래그다 (v4 의 JS 측 이름 `terrainLightLevels` / `terrainHeldLight` 는 번들에서 완전히 사라졌다).

**팩에서 이 uniform 을 직접 참조하지 마라.** 헤더 함수 (`bloxdSeconds()` 등) 를 통해 쓴다. 스테이지 가시성이 VERTEX|FRAGMENT 이므로, 헤더 함수는 모듈 스코프 함수와 버텍스 훅에서도 동작한다.

## 바인드 그룹 레이아웃

| binding | 내용 |
|---|---|
| 0 | `bloxdPackInputs` uniform (64 B) |
| 1 | 씬 깊이 텍스처 (액체 베리언트) |
| 2 | `bloxdSpTextureLayers` 스토리지 버퍼 |

`minBindingSize` 는 64 그대로다. 깊이 텍스처 (binding 1) 는 FRAGMENT 전용이며, 이것이 `bloxdOpaqueBehind()` 가 서피스/light 훅 전용인 이유다.

## wgsl 연결

여러 `.wgsl` 파일은 **경로명의 사전 순**으로 하나의 모듈에 연결된다. 모듈 스코프 선언은 순서 무관. `var` 초기화 순서만 영향을 줄 수 있다. `.wgsl` 이 아닌 파일은 무시된다.
