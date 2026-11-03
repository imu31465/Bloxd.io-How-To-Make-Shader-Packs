# 외관 문제

> 대상 API: 5 · 상태: Verified

컴파일은 잘 되는데 이상해 보인다.

## 거리가 희게/뿌옇게 변한다

- **원인**: 포그 이중 적용. 기본 light 훅 출력은 **이미 포그가 적용**되어 있다 (`bloxdApplyFog(lit + emission, light)`). 그 위에 포그색을 더 섞으면 두 번이 된다
- **해결**: 커스텀 포그는 은은하게. 채도만의 대기 원근법도 고려하라 ([리얼화 레시피](../recipes/realism.md))
- **예방**: 포그를 쓰기 전에 `fogAlpha` 의 의미 (0 = 포그 없음, 1 = fogColour 뿐) 와 [파이프라인](../api/lighting.md#전체-파이프라인) 을 이해한다

## pow(l.skyLight, γ) 로 그림자가 절대 어두워지지 않는다

- **원인**: `skyLight` 은 리프트 곡선 적용 후로 도착한다 (생 0.87 이 0.97 로). 감마는 수학적으로 대적할 수 없다
- **해결**: 리프트 역변환 + 임계값으로 전환한다 ([그림자](../guides/shadows.md))

## 블록이 거의 순백이 된다

- **원인**: light 훅 출력이 1.0 을 넘는다 (출력 너머에 클램프가 없다)
- **해결**: `clamp(col, vec3f(0.0), vec3f(1.0))` 을 붙인다

## 가산 없이 하얘진다

- **원인**: 나눗셈에 의한 포그 역산 (un-fog)
- **해결**: un-fog 를 버린다. `s.colour` 에서 다시 만들고 포그는 마지막에 정확히 한 번 (`bloxdApplyFog` 경유 포함) 적용한다

## 발광 블록이 빛나지 않는다 (팩 재구축 시)

- **원인**: emission 재가산 누락 — 기본 출력을 버리면 emission 을 직접 더해야 한다
- **해결**: `+ s.emission * (1.0 - l.fogAlpha)` 를 더한다. v5 에서는 `bloxdLitColour()` + emission + `bloxdApplyFog` 구성이 가장 안전하다 ([라이팅](../api/lighting.md))

## 파도·무늬가 청크·원점 전환에서 끊긴다

- **원인**: 렌더 공간 위치를 직접 씀 — 원점은 플레이어와 함께 움직인다
- **해결**: 월드 의존 효과에는 `bloxdWorldPosition(position)` 을 쓴다 ([좌표 레시피](../recipes/coordinates.md)). 원점에서 먼 곳의 f32 정밀도 한계에도 주의

## 회전된 면에서 수면 무늬가 어긋난다

- **원인**: `bloxdTexel` 이 프래그먼트 자신의 `textureRotation` 을 당신의 uv 에 적용한다 ([회전의 미묘함](../api/texture-api.md#회전의-미묘함--중립-샘플러))
- **해결**: `texelNeutral` 헬퍼로 미리 회전한다

## 인챈트 글린트 / 피격 플래시가 사라졌다

- **원인**: 커스텀 라이팅이 `enchantColour` / `overlayColour` 를 통과시키지 않고 재구축됨
- **해결**: 통과시키거나 `bloxdLitColour()` 를 쓴다 ([인챈트 효과](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` 은 둘 다 그대로 통과시키므로, 기본값에서는 잃지 않는다

## 하늘·구름·태양 원반이 영향을 받지 않는다

- **설계상 그렇다**: 훅은 terrain / liquid / model 만 덮는다 ([도달할 수 없는 표현](../guides/constraints.md))

## 관련 문서

- [라이팅 문제](lighting.md) · [디버깅 팁](../guides/debugging.md) · [포그의 내부](../internals/fog-internals.md)
