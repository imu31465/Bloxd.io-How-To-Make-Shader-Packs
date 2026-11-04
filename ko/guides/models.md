# 모델과 텍스처

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션 확인) · 상태: Analyzed (헤더·검증기에서 복원)

v5 의 새 Model 훅이 그리는 것과 읽는 것.

## Model 프로그램이 그리는 것

- **블록 모델**: 반 블록 (`slab`), 계단 (`stairs`), 교차 평면 식물 — 키 큰 잔디, 꽃, 작물, 거미줄 (`flat`)
- **아이템**: 손에 든 것 (`held`), 떨어진 것 (`dropped`), 던진 것 (`thrown` — 눈덩이, 화살, 로켓)
- **엔티티**: 플레이어, 몹, NPC (`lifeform`) — **방어구와 화장품 포함**

지형 (완전 블록) 과 Liquid (물) 은 이 프로그램에 들어오지 않는다.

## 읽는 것이 달라지는 부분

모델 면은 지형 면에 없는 세 가지를 싣는다:

| 정보 | 필드 | 지형에서의 값 |
|---|---|---|
| 모델 로컬 좌표 | `localPosition: vec3f` | `vec3f(0.0)` (모델 아님) |
| 인챈트 상태 | `enchantTier` / `enchantColour` / `enchantSpeed` | 전부 0 |
| 엔티티 오버레이 | `overlayColour` | 0 |

그리고 **텍스처의 의미가 다르다**: 지형 면은 아틀라스 `textureId` 를 실지만, **대부분의 모델은 `textureId: 0`** (「텍스처 없음」) 이다 — 플레이어 스킨과 몹 텍스처는 아틀라스 네임스페이스에 없다. `surface.colour` 에는 이미 스킨 × tint 가 들어 있으므로 그것부터 쓴다 ([모델 자체 텍스처](../api/texture-api.md#모델-자체-텍스처-textureid-0)).

`flags` 의 `held` / `dropped` / `thrown` / `lifeform` / `placed` 는 모델 면에서만 의미가 있다 ([플래그](../api/flags.md)).

## localPosition

월드 배치 **이전의**, 모델 인스턴스 로컬 위치. 지형/액체에서는 `vec3f(0.0)` 이다.

- 플레이어 팔, 손에 든 검, 풍차 날개 등에서는 모델과 함께 회전한다
- **부품별 애니메이션과 굽힘 효과**가 한 필드 쓰기로 된다 — 「검의 어느 높이인가」가 곧 `localPosition.y` 다
- light 구조체에서는 **버텍스 훅 적용 후**의 값이다 (헤더: *"the same as in BloxdVertexIn, after the vertex hook"*)

## 선택 패턴

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

전체 예시: [모델 셰이더 레시피](../recipes/model-shaders.md) 와 [인챈트 효과](../recipes/enchant-effects.md).

## Terrain / Liquid / Model 치트 시트

| 영향을 주고 싶은 대상 | 훅 | 선택 필드 |
|---|---|---|
| 완전 블록의 룩 | `bloxdTerrain*` | 머티리얼 플래그 (`opaque` / `rock`…) |
| 물 | `bloxdLiquid*` | 항상 Liquid (Liquid 훅 없음 = 물 무손상) |
| 식물, 반 블록, 계단 | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| 손에 든 아이템 | `bloxdModel*` | `flags.held` |
| 떨어진 아이템 | `bloxdModel*` | `flags.dropped` |
| 던진 아이템 | `bloxdModel*` | `flags.thrown` |
| 플레이어와 몹 | `bloxdModel*` | `flags.lifeform` |

## 라이팅

`bloxdModelLight` 는 같은 `BloxdSurface` / `BloxdLightIn` 를 받고, `bloxdDefaultLight` / `bloxdLitColour()` 와 함께 동작한다. 인챈트 글린트 (`enchantColour`) 와 피격 플래시 (`overlayColour`) 는 `bloxdLitColour` 안에서 섞이므로, **기본값이 두 외관을 자동 보존한다**. 제어하려면 [인챈트 효과](../recipes/enchant-effects.md) 를 보라.

## 내부

모델이 어떻게 렌더되고 플래그/인챈트 입력이 어떻게 흐르는가: [엔진 내부와 연구: 모델 렌더링](../internals/model-rendering.md). `bloxdSpItemLocalPosition` 이나 `bloxdSpEnchant` 같은 생성 심볼은 [제한과 예약명](../api/restrictions.md) 에 실려 있다.
