# 예약 식별자의 내부

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 번들의 생성기에서 복원)

`bloxdSp*` 네임스페이스 — 생성기가 주입할 수 있어 팩이 재선언할 수 없는 심볼. 팩 작가용 요약: [제한과 예약명](../api/restrictions.md).

## 46 심볼

v4 의 27 에서 **46** 으로 늘었다 (20 추가, 1 은퇴 — `bloxdSpLitColour`, 공개 `bloxdLitColour()` 로 승격):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

## 새 이름 ↔ v5 기능

- `bloxdSpFlags` — `BloxdFlags` 구조체의 전달
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — 새 입력 (인챈트, 모델 로컬 위치)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — 셀 샘플링 텍스처팩 경로
- `bloxdSpQuarterTurns` — 회전 체인 ([텍스처 샘플링](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — 확장 훅 로컬

## 팩 수준 규칙

이 네임스페이스보다 넓다: **`/^bloxd/i` (대소문자 무관) 에 맞는 전부**. 선언할 수 있는 것은 9개 훅 함수명뿐이다 ([검증 오류](../troubleshooting/validation.md)).

`bloxdTextureId` 접두 식별자는 텍스처 이름으로 해석되며, 전용 오류 계열이 붙는다 ([텍스처 문제](../troubleshooting/textures.md)).

## 관련 문서

- [제한과 예약명](../api/restrictions.md) · [텍스처 샘플링](texture-sampling.md) · [버전 히스토리: v5](../history/v5.md)
