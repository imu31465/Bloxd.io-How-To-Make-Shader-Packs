# Флаги (BloxdFlags)

> Целевой API: 5 · Целевой билд: `ab90qa` · Статус: Analyzed (восстановлено дословно из живого заголовка)

v5 определяет грани именованной структурой из bool. Битовая маска `blockFlags: u32` из v4 и её 6 констант `bloxdBlockFlag*` исчезли.

## Определение (дословно из заголовка)

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

## Справочник полей

| Поле | Класс | Значение | Типичные объекты | Хуки |
|---|---|---|---|---|
| `opaque` | материал | полный куб без щелей и отверстий | камень, земля, цельное дерево | все 9 |
| `emissive` | материал | блоки, излучающие свет | лава, светящиеся руды | все 9 |
| `vegetation` | материал | листва, травяные блоки, лиственные растения | листва, высокая трава | все 9 |
| `dirt` | материал | почва (травяные блоки включены) | земля, травяной блок, Rocky Dirt (также rock) | все 9 |
| `sand` | материал | семейство песка и песчаника | песок, красный песок, каждый песчаник (также rock) | все 9 |
| `rock` | материал | семейство камня (+ гравий, руды, магма) | разновидности камня, гравий, руды | все 9 |
| `slab` | форма | полублоки | полублоки | хуки Model |
| `stairs` | форма | ступени и угловые ступени | ступени | хуки Model |
| `flat` | форма | плоскости (вкл. скрещённые плоскости) | высокая трава, цветы, посевы, паутина | хуки Model |
| `placed` | размещение | геометрия, размещаемая как часть чанков | блоки мира | хуки Model (не предметы/транспорт) |
| `held` | размещение | предметы, удерживаемые в руке (от 1-го/3-го лица) | предметы в руках, броня | хуки Model |
| `dropped` | размещение | предметы на земле / конвейере / в трубе | выпавшие предметы | хуки Model |
| `thrown` | размещение | предметы в полёте | снежки, стрелы, ракеты | хуки Model |
| `lifeform` | цель | игроки, мобы, NPC (броня и косметика включены) | существа | хуки Model |

## Флаги свободно сочетаются

**Флаги — не enum с единственным выбором.** Истинными одновременно может быть любое их число — возможно, ни одного (сам заголовок говорит *«Any number of flags may be set, possibly even none»*).

Примеры, которые даёт сам заголовок:

- **песчаник — это одновременно `sand` и `rock`**
- **Rocky Dirt — это одновременно `dirt` и `rock`**
- полублок может одновременно быть `slab` и (в зависимости от материала) `rock`

Читать ветку `else` одного флага как «всё остальное» — баг. Флаги материала (`opaque`/`emissive`/…) сочетаются с флагами формы/состояния (`slab`/`held`/…) **независимо**.

## Использование

`flags` — одноимённое поле во всех трёх входных структурах (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

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

В модельном пайплайне флаги отвечают на вопрос «на что я смотрю»:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // поднять существ мира, исключить руку
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // осветлить предметы в руках локального игрока
    }
    return out;
}
```

## Миграция с v4 (механическая)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Оставшиеся ссылки на константы `bloxdBlockFlag*` проваливают диагностику зарезервированных имён анализатора (константы удалены).

## Граничные случаи (исчерпывающе, из заголовка)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — грани `slab`/`stairs`/`flat` никогда не попадают в программу Terrain и никогда не ставят `opaque`
- «Includes armour and cosmetics» — `lifeform` покрывает и экипировку игрока
- «Not items or vehicles» — `placed` исключает транспорт

## См. также

- Полная миграция с v4 → [История версий: v5](../history/v5.md)
- Внутренности доставки флагов → [Внутренности движка](../internals/rendering-pipeline.md)
