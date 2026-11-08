# シェーダーフック

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified

シェーダーパックがレンダラーに差し込めるのは **9つのフック** です。3つの描画対象 (Terrain / Liquid / Model) × 3つのパイプライン段階 (Vertex / Surface / Light) の組み合わせで、すべて任意定義です (定義しなければエンジンのデフォルト挙動が使われます)。

## フックの一覧

| フック | 段階 | 何をするか |
|---|---|---|
| `bloxdTerrainVertex` | 地形・頂点 | 地形の頂点移動。**strict では使用不可** |
| `bloxdTerrainSurface` | 地形・表面 | 地形の色・透明度・発光・エンチャント・オーバーレイ |
| `bloxdTerrainLight` | 地形・光 | 地形の最終色。フラグメントの最終段 |
| `bloxdLiquidVertex` | 液体・頂点 | 水の頂点移動。**strict では使用不可** |
| `bloxdLiquidSurface` | 液体・表面 | 水の色・透明度・発光 |
| `bloxdLiquidLight` | 液体・光 | 水の最終色 |
| `bloxdModelVertex` | モデル・頂点 | ブロックモデル・アイテム・エンティティの頂点移動。**strict では使用不可** |
| `bloxdModelSurface` | モデル・表面 | モデルの色・透明度・発光・エンチャント・オーバーレイ |
| `bloxdModelLight` | モデル・光 | モデルの最終色 |

シグネチャ (型まで正確に一致させること。引数名は自由):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* も同じ型
```

## 描画対象の分担

v5 では3系統のフックの分担が明確です:

- **Terrain** — 水とブロックモデル**以外**のすべてのブロック
- **Liquid** — 水
- **Model** — ブロックモデル (ハーフブロック・階段・草花などの交差平面)、ドロップされた/手に持った/投げられたアイテム、プレイヤー、モブ、NPC、防具、コスメティック

**重要**: パックに Liquid Hook がない場合、**水には Terrain Hook は実行されません** (水は Liquid Hook だけで処理される)。Terrain Hook だけで水も変わるとした旧バージョンの説明とは異なります。

## フォールバックの規則

- フックが未定義なら、その段階は**エンジンのデフォルト** (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight` と同じ挙動) になる
- **同じ処理を複数フックで共有したい**場合は、モジュールスコープの関数を定義して両方から呼ぶ:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## デフォルトパック (9フック同梱の公式テンプレート)

新しいパックの出発点となるテンプレートに、v5 では light フックも入りました。出荷形態で 1,683 バイト、全文逐語:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

テンプレートのコメントがそのまま設計指針です:

- *«Modify the return values to start building a shader pack. If you delete a hook, the default is used instead.»* — 戻り値をいじってパックを作り始める。フックを削除すればデフォルトに戻る
- *«Strict games keep terrain where it is. Without the #ifndef, this hook would turn the whole shader pack off there.»* — strict ゲームは地形を動かさない。`#ifndef` ガードなしに vertex フックを置くと、その strict ゲームではパック全体が無効になる
- *«To share code with another hook, define a function and call it from both places.»* — コード共有は関数定義で

## 書くときの作法

- 出力構造体は**直接構築しない** (`BloxdSurface(...)` は検証エラー)。必ず `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` から作ってフィールドを書き換える。例外として light フックの第 1 引数 `s: BloxdSurface` は出力と同型なので `var out = s;` で始めることもできる
- 未初期化の `var x: BloxdSurface;` (型注釈だけの宣言) も検証エラーになる
- フックの引数は**読み取り専用**。書き換えたい場合は `var sv = s;` のようにコピーしてから
- 自分の識別子に `bloxd` 接頭辞 (大小文字無視) は使えない (9つのフック関数名を除く)
- 定数は `const` で書く (`#define` に値は書けない)

各フックで読み書きできる入力・出力構造体の全フィールドは [API Reference の構造体](../api/structures.md) を参照してください。
