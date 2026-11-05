# 텍스처 문제

> 대상 API: 5 · 대상 빌드: `bny9u` · 상태: Verified (메시지는 라이브 검증기에서 그대로 기록)

`bloxdTextureId*` / `bloxdTexel` 관련 문제. 896 이름 전체는 [텍스처 카탈로그](../api/texture-catalog.md) 에서 검색하라.

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **원인**: 오철자. 검증기에는 **레벤슈타인 제안** 이 있다 (임계값 `max(2, floor(len/4)) + 1`)
- **해결**: 제안을 받아들인다. [카탈로그](../api/texture-catalog.md) 와 교차 확인한다
- **예방**: 이름은 카탈로그에서 복사·붙여넣기 한다

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **원인**: 애니메이션 텍스처에 **프레임 번호**를 씀 (`lava0` 등)
- **해결**: 기본명을 쓴다 — 샘플이 현재 프레임을 자동으로 반환한다
- **예방**: 42개 애니메이션 계열에는 프레임 접미사를 절대 쓰지 않는다 ([명명 규칙](../api/texture-api.md#철자-규칙과-명명의-자유))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **원인**: 회전 계열의 회전 사본 철자 (`[rot[N`) 를 씀
- **해결**: 루트명을 쓴다 — `bloxdTexel` 이 회전을 다시 적용한다

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **원인**: 대소문자/언더스코어 무관 접기가 이름을 **모호하게** 남겼다
- **해결**: 철자를 비모호하게 고친다

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **원인**: 접두사 오철자 (예: `bloxdTextureID`, `bloxdtextureid`)
- **해결**: 이름을 정확히 `bloxdTextureId` 로 시작하게 한다

## 「대소문자와 언더스코어는 구별되지 않는다」 — 두 규칙은 어떻게 공존하는가

이름 해석은 대소문자와 `_` 를 접으므로, `bloxdTextureId_grass_top` 과 `bloxdTextureIdGrassTop` 은 **같은** 상수로 해석된다. 접기가 여러 후보를 남겼을 때만 전용 모호성 오류가 나간다 ([명명 규칙](../api/texture-api.md#철자-규칙과-명명의-자유)).

## 모델에서 bloxdTexel 이 항상 흰색을 반환

- **설계상 그렇다**: 대부분의 모델은 `textureId: 0` (텍스처 없음 — 플레이어 스킨 등). `bloxdTexel(0, ...)` 은 `vec4f(1.0)` 을 반환한다
- **해결**: `surface.textureId != 0u` 로 골라낸다 ([모델 자체 텍스처](../api/texture-api.md#모델-자체-텍스처-textureid-0))

## 텍스처를 추가하고 싶다

- **한계**: 셰이더 팩 API 는 아틀라스를 **읽기만** 한다. 텍스처 추가는 텍스처팩 시스템의 임무다 ([조합](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **원인**: `texture_*` / `sampler` 형을 직접 선언함
- **해결**: `bloxdTexel()` 을 경유한다 ([제한과 예약명](../api/restrictions.md))

## 게임 업데이트 후 원시 id 가 깨졌다

- **원인**: **id 는 스냅샷이다** — 실측으로, 두 빌드 사이에서 생존 이름 905 중 334개가 id 를 바꿨다
- **해결**: `19` 이 아니라 `bloxdTextureIdLava` 를 쓴다 ([이름이 API](../api/texture-catalog.md#실측-드리프트-cnty9--ab90qa))

## 관련 문서

- [텍스처 API](../api/texture-api.md) · [텍스처 카탈로그](../api/texture-catalog.md) · [텍스처 레지스트리의 내부](../internals/texture-registry.md)
