# 플래그 (BloxdFlags)

> 대상 API: 5 · 대상 빌드: `v98qt8` · 상태: Analyzed (라이브 헤더에서 그대로 복원)

v5 는 면을 이름 붙은 bool 구조체로 식별한다. v4 의 `blockFlags: u32` 비트마스크와 그 6개 `bloxdBlockFlag*` 상수는 사라졌다.

## 정의 (헤더에서 그대로)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

## 필드 레퍼런스

| 필드 | 분류 | 의미 | 대표적인 대상 | 훅 |
|---|---|---|---|---|
| `opaque` | 머티리얼 | 틈이나 구멍 없는 완전한 정육면체 | 돌, 흙, 붙박이 나무 | 전 9개 |
| `emissive` | 머티리얼 | 빛을 내는 블록 | 용암, 빛나는 광석 | 전 9개 |
| `vegetation` | 머티리얼 | 나뭇잎, 잔디 블록, 잎 달린 식물 | 나뭇잎, 키 큰 잔디 | 전 9개 |
| `dirt` | 머티리얼 | 흙 (잔디 블록 포함) | 흙, 잔디 블록, Rocky Dirt (rock 이기도) | 전 9개 |
| `sand` | 머티리얼 | 모래·사암 계열 | 모래, 붉은 모래, 모든 사암 (rock 이기도) | 전 9개 |
| `rock` | 머티리얼 | 돌 계열 (+ 자갈, 광석, 마그마) | 돌 변형, 자갈, 광석 | 전 9개 |
| `slab` | 형상 | 반 블록 | 반 블록 | Model 훅 |
| `stairs` | 형상 | 계단·모서리 계단 | 계단 | Model 훅 |
| `flat` | 형상 | 평면 (교차 평면 포함) | 키 큰 잔디, 꽃, 작물, 거미줄 | Model 훅 |
| `placed` | 배치 | 청크의 일부로 놓인 지오메트리 | 월드 블록 | Model 훅 (아이템·탈것 제외) |
| `held` | 배치 | 손에 든 아이템 (1인칭/3인칭) | 손에 든 아이템, 방어구 | Model 훅 |
| `dropped` | 배치 | 바닥·컨베이어·파이프 위의 아이템 | 떨어진 아이템 | Model 훅 |
| `thrown` | 배치 | 비행 중인 아이템 | 눈덩이, 화살, 로켓 | Model 훅 |
| `lifeform` | 대상 | 플레이어, 몹, NPC (방어구·화장품 포함) | 엔티티 | Model 훅 |

## 플래그는 자유롭게 조합된다

**플래그는 단일 선택 enum 이 아니다.** 임의의 수가 동시에 true 가 될 수 있고, 하나도 없을 수도 있다 (헤더 자신의 주석: *"Any number of flags may be set, possibly even none"*).

헤더 자신이 드는 예:

- **사암 (sandstone) 은 `sand` 와 `rock` 이 동시에 true**
- **Rocky Dirt 는 `dirt` 와 `rock` 이 동시에 true**
- 반 블록은 `slab` 과 (머티리얼에 따라) `rock` 등이 동시에 true 일 수 있다

한 플래그의 `else` 분기를 「나머지 전부」로 읽는 것은 버그다. 머티리얼 플래그 (`opaque`/`emissive`/…) 는 형상·상태 플래그 (`slab`/`held`/…) 와 **독립적으로** 조합된다.

## 사용법

`flags` 는 세 입력 구조체 (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`) 모두에 같은 이름의 필드로 있다:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

모델 파이프라인에서는 플래그가 「지금 무엇을 보고 있는가」에 답한다:

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

## v4 에서의 이주 (기계적)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

`bloxdBlockFlag*` 상수로의 남은 참조는 분석기의 예약명 진단에 걸린다 (상수가 삭제되었다).

## 예외 케이스 (전수, 헤더에서)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` 의 면은 Terrain 프로그램에 들어가지 않고 `opaque` 도 세지 않는다
- «Includes armour and cosmetics» — `lifeform` 은 플레이어 장비도 덮는다
- «Not items or vehicles» — `placed` 는 탈것을 제외한다

## 관련 문서

- v4 전체 이주 → [버전 히스토리: v5](../history/v5.md)
- 플래그 전달의 내부 → [엔진 내부와 연구](../internals/rendering-pipeline.md)
