# フラグ (BloxdFlags)

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブヘッダーから逐語復元)

v5 は面の識別を名前付き boolean 構造体で行います。v4 の `blockFlags: u32` ビットマスクと 6 個の `bloxdBlockFlag*` 定数は廃止されました。

## 定義 (ヘッダーから逐語)

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

## フィールド一覧

| フィールド | 分類 | 意味 | 主な当該オブジェクト | 利用できる Hook |
|---|---|---|---|---|
| `opaque` | 材質 | 隙間や穴のないフルブロック (不透明) | 石、土、木材のフルブロック | 全9フック |
| `emissive` | 材質 | 光を放つブロック | 溶岩、輝く鉱石 | 全9フック |
| `vegetation` | 材質 | 葉・草ブロック・草本 | 葉、草ブロック、背の高い草 | 全9フック |
| `dirt` | 材質 | 土壌 (草ブロックを含む) | 土、草ブロック、Rocky Dirt (これは rock も true) | 全9フック |
| `sand` | 材質 | 砂・サンドストーン系 | 砂、赤砂、すべてのサンドストーン (rock も true) | 全9フック |
| `rock` | 材質 | 石系 (+礫・鉱石・マグマ) | 石系バリアント、砂利、鉱石、マグマ | 全9フック |
| `slab` | 形状 | ハーフブロック | 各種スラブ | Model フック (ブロックモデルとして描画) |
| `stairs` | 形状 | 階段・角階段 | 各種階段 | Model フック |
| `flat` | 形状 | 平面 (交差平面を含む) | 背の高い草、花、作物、クモの巣 | Model フック |
| `placed` | 配置・状態 | チャンクの一部として設置されたジオメトリ | ワールド内ブロック | Model フック (アイテム・乗り物は含まない) |
| `held` | 配置・状態 | 手に持ったアイテム (一人称・三人称) | 保持アイテム、防具 | Model フック |
| `dropped` | 配置・状態 | 地面・ベルト・パイプ上のアイテム | ドロップアイテム | Model フック |
| `thrown` | 配置・状態 | 飛行中のアイテム | 雪玉、矢、ロケット | Model フック |
| `lifeform` | 対象 | プレイヤー・モブ・NPC (防具・コスメ含む) | プレイヤー、モブ、NPC、防具、コスメ | Model フック |

## 複数フラグの組み合わせ

**フラグは単一選択の enum ではありません**。任意の数のフラグが同時に true になりえますし、1つも立たないこともあります (ヘッダー自身の注記: *"Any number of flags may be set, possibly even none"*)。

実例 (ヘッダー自身が挙げるもの):

- **砂岩 (sandstone) は `sand` と `rock` が両方 true**
- **Rocky Dirt は `dirt` と `rock` が両方 true**
- スラブは `slab` と (素材に応じて) `rock` 等が同時に立つ

単一フラグの `else` を「それ以外」と解釈する書き方は誤りです。素材判定 (`opaque`/`emissive`/...) は形状・状態フラグ (`slab`/`held`/...) と**独立に**組み合わさります。

## 使い方

`flags` は3つの入力構造体 (`BloxdVertexIn`、`BloxdSurfaceIn`、`BloxdLightIn`) の同名フィールドから読みます:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);   // 植生だけ緑かせ
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);            // 光る素材は微発光
    }
    return out;
}
```

モデルパイプラインでは「何を見ているか」の判別に: 

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // 世界のエンティティだけ持ち上げ、手に持ったものは除外
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    // ローカルプレイヤーの保持アイテムだけ明るく (v5 で初めて書けるレシピ)
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## v4 からの移植 (機械的対応表)

6 個の v4 ビット検査はフィールドアクセスに 1 対 1 で対応します (移行はリネームであって再設計ではありません):

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

`bloxdBlockFlag*` 定数の残存参照はアナライザの予約名診断で検証に失敗します (定数は削除済み)。

## エッジケースの正確な一覧

ヘッダー文言が明示するエッジケース:

- «Rocky Dirt is rock too» — `rock` は地質学的分類でなく石系描画分類
- «every sandstone, which is rock too» — サンドストーンは `sand` ∧ `rock`
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` の面は Terrain プログラムに入らず `opaque` も立たない
- «Includes armour and cosmetics» — `lifeform` はプレイヤー装備も含む
- «Not items or vehicles» — `placed` は乗り物を含まない

## 関連

- v4 `blockFlags` からの移行の全体手順 → [Version History: v5](../history/v5.md)
- v3 時点の blockFlags 诞生時の仕様 → [Version History: v3](../history/v3.md)
- フラグの生成からフックへの受け渡しの内部 → [Engine Internals](../internals/rendering-pipeline.md)
