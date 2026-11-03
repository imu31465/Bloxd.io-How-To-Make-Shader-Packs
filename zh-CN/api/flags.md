# 标志 (BloxdFlags)

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Analyzed (从现行标头逐字复原)

v5 以具名布尔结构体标识面。v4 的 `blockFlags: u32` 位掩码及其 6 个 `bloxdBlockFlag*` 常量已被移除。

## 定义 (逐字取自标头)

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

## 字段参考

| 字段 | 类别 | 含义 | 典型对象 | 钩子 |
|---|---|---|---|---|
| `opaque` | 材质 | 无缝隙无孔洞的完整方块 | 石头、泥土、实心木 | 全部 9 个 |
| `emissive` | 材质 | 发光方块 | 岩浆、发光矿石 | 全部 9 个 |
| `vegetation` | 材质 | 树叶、草方块、叶状植物 | 树叶、高草 | 全部 9 个 |
| `dirt` | 材质 | 土壤 (含草方块) | 泥土、草方块、Rocky Dirt (同时也是岩石) | 全部 9 个 |
| `sand` | 材质 | 沙与砂岩一族 | 沙子、红沙、各种砂岩 (同时也是岩石) | 全部 9 个 |
| `rock` | 材质 | 石头一族 (+ 砂砾、矿石、岩浆) | 各类石头、砂砾、矿石 | 全部 9 个 |
| `slab` | 形状 | 半砖 | 台阶 | Model 钩子 |
| `stairs` | 形状 | 楼梯与转角楼梯 | 楼梯 | Model 钩子 |
| `flat` | 形状 | 平面 (含交叉平面) | 高草、花、作物、蜘蛛网 | Model 钩子 |
| `placed` | 放置 | 作为区块一部分放置的几何体 | 世界方块 | Model 钩子 (不含物品/载具) |
| `held` | 放置 | 手持物品 (第一/第三人称) | 手持物、盔甲 | Model 钩子 |
| `dropped` | 放置 | 地面 / 传送带 / 管道上的物品 | 掉落物 | Model 钩子 |
| `thrown` | 放置 | 飞行中的物品 | 雪球、箭、火箭 | Model 钩子 |
| `lifeform` | 目标 | 玩家、生物、NPC (含盔甲与外观装饰) | 实体 | Model 钩子 |

## 标志可自由组合

**标志不是单选枚举。** 任意数量可同时为真 — 也可能全不为真 (标头自己写着 *「Any number of flags may be set, possibly even none」*)。

标头自己给出的例子：

- **砂岩同时是 `sand` 和 `rock`**
- **Rocky Dirt 同时是 `dirt` 和 `rock`**
- 一个台阶可以同时是 `slab` 和 (依材质而定) `rock`

把某个标志的 `else` 分支当作「其余一切」来读是 bug。材质标志 (`opaque`/`emissive`/…) 与形状/状态标志 (`slab`/`held`/…) **相互独立地**组合。

## 用法

`flags` 是三个输入结构体 (`BloxdVertexIn`、`BloxdSurfaceIn`、`BloxdLightIn`) 上的同名字段：

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

在模型管线中，标志回答「我看的是什么」：

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

## 从 v4 迁移 (机械操作)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

残留的 `bloxdBlockFlag*` 常量引用会触发分析器的保留名称诊断 (这些常量已删除)。

## 边界情形 (穷举，来自标头)

- «Rocky Dirt is rock too» (Rocky Dirt 同时也是岩石)
- «every sandstone, which is rock too» (所有砂岩同时也是岩石)
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` 的面从不进入 Terrain 程序、从不置 `opaque`
- «Includes armour and cosmetics» — `lifeform` 也覆盖玩家装备
- «Not items or vehicles» — `placed` 不含载具

## 相关

- 完整 v4 迁移 → [版本历史: v5](../history/v5.md)
- 标志传递内部机制 → [引擎内部](../internals/rendering-pipeline.md)
