# 팩에 보이는 값을 바꾸는 요인

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션) · 상태: Analyzed (프로덕션 번들의 JavaScript 수준 분석)

같은 팩도 **월드와 플레이어 설정에 따라** 다르게 보인다. 배포 전에는 적어도 다음 3 환경에서 겉모습을 확인할 것:

1. **통상 월드** (default 스카이박스·오버라이드 없음) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`·기본색
2. **space 계열 스카이박스 월드** — bloxdSunDirection() = 0. `sunPresent` 분기의 겉모습
3. **`visionMinLightColour`·`skyLightColourOverride` 를 정한 커스텀 월드** — 어두운 곳과 색이 들려 있는 경우

- 주된 변동원: `lightingOverride` (조명 강제) / `skyLightColourOverride`·`ambientLightColourOverride` (hex 교체) / `visionMinLightColour` (시인 최암색. 구현은 `uSkyLightColour` 와 `uAmbientLightColour` 쌍방에의 성분별 max 이며, Night Vision 이 사용한다. 「동굴을 깜깜하게」 계열은 예상보다 어두워지지 않고, 하늘색 자체도 바닥 올림이 된다) / `heldLightColourOverride`·`Range`·`ConeAngle` / `fogChunkDistanceOverride`·`fogColourOverride`·`fogOnSkybox` / `skyBox` (bloxdSunDirection() 유무). `uSkyLightColour` 기본 = (1,1,1) 흰색, `uAmbientLightColour` 기본 = (0.25,0.25,0.30). `l.ambient` 의 씬측 = 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5). `(1.0 - l.fogAlpha)` 는 플레이어의 포그/청크 거리 설정을 따라간다. 그 외에 `cameraTint` (화면 전체로의 RGBA 틴트) 와 `proximityFadeDistance`·`proximityFadeMinOpacity` (엔티티의 카메라 근접 페이드) 도 월드 설정 유래의 변동 요인이며, 특히 `cameraTint` 는 팩 출력 위에 얹히는 최종 처리이다. 이것들의 다수는 스크립트 API (`serverOption`) 경유로도 설정할 수 있어, 게임 실행 중에도 갱신될 수 있다.
