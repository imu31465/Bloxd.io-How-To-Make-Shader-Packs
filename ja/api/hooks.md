# シェーダーフック

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Verified

パックが定義できるフックは **9つ** です。3つの描画対象 (プログラム) × 3つのパイプライン段階の組み合わせで、すべて任意定義です (未定義ならエンジンのデフォルト)。

## 9フック比較表

| フック | プログラム | 段階 | 引数 | 戻り値 | 実行条件 |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | 頂点 | `BloxdVertexIn` | `BloxdVertex` | 頂点移動可 = allow バリアントのみ (**strict では定義そのものが禁止**) |
| `bloxdTerrainSurface` | Terrain | 表面 | `BloxdSurfaceIn` | `BloxdSurface` | 常に |
| `bloxdTerrainLight` | Terrain | 光 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 常に |
| `bloxdLiquidVertex` | Liquid | 頂点 | `BloxdVertexIn` | `BloxdVertex` | allow のみ (同上) |
| `bloxdLiquidSurface` | Liquid | 表面 | `BloxdSurfaceIn` | `BloxdSurface` | 常に |
| `bloxdLiquidLight` | Liquid | 光 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 常に |
| `bloxdModelVertex` | Model | 頂点 | `BloxdVertexIn` | `BloxdVertex` | allow のみ (同上) |
| `bloxdModelSurface` | Model | 表面 | `BloxdSurfaceIn` | `BloxdSurface` | 常に |
| `bloxdModelLight` | Model | 光 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 常に |

## 各プログラムが描くもの

| プログラム | 対象 | Liquid Hook がないときの水 |
|---|---|---|
| **Terrain** | 水とブロックモデル以外のすべてのブロック | — |
| **Liquid** | 水 | **Terrain Hook は実行されない** (水はデフォルト描画のまま) |
| **Model** | ブロックモデル (ハーフブロック・階段・草花・作物・クモの巣)、手に持った/ドロップ/投げられたアイテム、プレイヤー、モブ、NPC、防具、コスメティック | — |

パックに Liquid Hook がない場合、水には** Terrain Hook も Liquid Hook も実行されません** (v4 以前の「liquid がなければ terrain が代行」する挙動は廃止)。

## 段階ごとの役割

- **Vertex** — 頂点位置の変更。`position` を動かす (草の揺れ、波など)。頂点移動は strict ゲームでパック全体を無効化するため、`#ifndef BLOXD_STRICT` ガードが必須
- **Surface** — 面のマテリアル出力。`colour` / `alpha` (条件付き) / `emission` / `enchantColour` / `overlayColour` を決める
- **Light** — 最終色。surface の出力と `BloxdLightIn` から最終的な色を計算する、フラグメントの最終段。戻り値がそのまま画面の色

## シグネチャ

型まで正確に一致させます (引数名は自由):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* も同じ引数型・戻り値型
```

## 特殊関数の呼び出し制限

エンジンのバリデータは一部の関数に「どのフックから呼べるか」の制限を持ちます (違反すると専用の "reaches" 診断で検証に失敗します):

| 関数 | 呼び出し可能なフック | ガード |
|---|---|---|
| `bloxdTexel` | Surface / Light のみ | — |
| `bloxdTextureSize` | Surface / Light のみ | — |
| `bloxdOpaqueBehind` | Surface / Light のみ (Liquid バリアントで意味を持つ) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` は v5 で削除されました (v4 までは Vertex フックからも呼べる唯一の特殊関数でした)。代替はありません — 「どのブロックか」が必要なら `flags` を検査します。

## フォールバックとコード共有

- フックが未定義なら、その段階はエンジンのデフォルト (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight` と同じ挙動)
- **複数フックで同じ処理を共有する**には、モジュールスコープの関数を定義して両方から呼ぶ (デフォルトパックテンプレートのコメントがまさにこれを説明している):

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## 関連

- 9フックを同梱した公式デフォルトテンプレート → [Getting Started: シェーダーフック](../getting-started/hooks.md)
- 各構造体の全フィールド → [入出力構造体](structures.md)
- フック呼び出しの内部処理 → [Engine Internals: Hook Invocation](../internals/hook-invocation.md)
