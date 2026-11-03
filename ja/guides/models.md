# モデルの描画とテクスチャ

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (ヘッダー・バリデータから復元)

v5 の新しい Model フック (`bloxdModelVertex` / `bloxdModelSurface` / `bloxdModelLight`) が何を描き、何が読めるかを説明します。

## モデルプログラムが描くもの

- **ブロックモデル**: ハーフブロック (`slab`)、階段 (`stairs`)、交差平面の植物 — 背の高い草、花、作物、クモの巣 (`flat`)
- **アイテム**: 手に持ったもの (`held`)、ドロップされたもの (`dropped`)、飛行中のもの (`thrown` — 雪玉、矢、ロケット)
- **エンティティ**: プレイヤー、モブ、NPC (`lifeform`)。**防具とコスメティックを含む**

Terrain (フルブロック) と Liquid (水) はこのプログラムには入りません。

## 何が違って読めるか

モデル面の `BloxdSurfaceIn` / `BloxdLightIn` は、地形には無い3種類の情報を運びます:

| 情報 | フィールド | 地形での値 |
|---|---|---|
| モデルローカル座標 | `localPosition: vec3f` | `vec3f(0.0)` (モデルが無い) |
| エンチャント状態 | `enchantTier` / `enchantColour` / `enchantSpeed` | すべて 0 |
| エンティティオーバーレイ | `overlayColour` | 0 |

そして**テクスチャの意味が変わります**: 地形面はブロックテクスチャアトラスの `textureId` を持ちますが、**モデルの多くは `textureId: 0`** (「テクスチャなし」) です — プレイヤースキンや Mob テクスチャはアトラスの名前空間に登録されていません。`surface.colour` には既にスキン × 色が反映済みなので、通常はそれを加工します ([テクスチャAPI: モデル独自のテクスチャ](../api/texture-api.md#モデル独自のテクスチャ-textureid-0))。

`flags` の `held` / `dropped` / `thrown` / `lifeform` / `placed` はモデル面でのみ意味を持ちます ([フラグ](../api/flags.md))。

## モデルローカル座標 (localPosition)

モデルインスタンスが世界に配置される**前の**、モデル空間での位置です。地形と液体では `vec3f(0.0)`。

- プレイヤーの腕、保持した剣、風車の羽根にとっては「モデルと一緒に回る座標」
- **キーになるパーアニメーションや湾曲効果**が世界空間の当て推量なしの1フィールドで書ける: 「剣の刃先に近いほど強い発光」が `localPosition.y` で直接書ける
- light 構造体では「vertex フック適用後」の値 — vertex フックが頂点を動かせば `localPosition` も追従 (ヘッダー注記: *"the same as in BloxdVertexIn, after the vertex hook"*)

## 典型的なレシピパターン

エンティティだけ、保持アイテムだけ、といった選別は `flags` の組み合わせで:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // 世界のエンティティを微妙に持ち上げ、手は除外
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // ローカルプレイヤーの保持アイテムを明るく
    }
    return out;
}
```

実装例の詳細は [モデルシェーダーのレシピ](../recipes/model-shaders.md) と [エンチャント効果](../recipes/enchant-effects.md) を参照。

## Terrain / Liquid / Model の使い分けまとめ

| 見たいもの | 使うフック | 判別に使うフィールド |
|---|---|---|
| フルブロックの見た目 | `bloxdTerrain*` | `flags.opaque` / `flags.rock` 等の材質 |
| 水 | `bloxdLiquid*` | 常に Liquid (Liquid Hook が無ければ水は素通り) |
| 植物・スラブ・階段 | `bloxdModel*` | `flags.flat` / `flags.slab` / `flags.stairs` |
| 手に持ったアイテム | `bloxdModel*` | `flags.held` |
| ドロップ品 | `bloxdModel*` | `flags.dropped` |
| 投擲物 | `bloxdModel*` | `flags.thrown` |
| プレイヤー・モブ | `bloxdModel*` | `flags.lifeform` |

## ライティングとの関係

`bloxdModelLight` は他の light フックと同じ `BloxdSurface` / `BloxdLightIn` を受け、`bloxdDefaultLight` / `bloxdLitColour()` もそのまま使えます。エンチャントきらめき (`enchantColour`) と被弾フラッシュ (`overlayColour`) は `bloxdLitColour` の内部で混合されるため、**デフォルトを通す限り両方の見た目は自動で維持**されます。両方をコントロールしたくなったら [エンチャント効果](../recipes/enchant-effects.md) を参照。

## 内部のしくみ

モデルがどうレンダリングされ、フラグやエンチャント入力がどう流れるかは [Engine Internals: Model Rendering](../internals/model-rendering.md) に、生成コードに現れる `bloxdSpItemLocalPosition` や `bloxdSpEnchant` といった内部シンボルは [予約識別子](../api/restrictions.md) を参照。
