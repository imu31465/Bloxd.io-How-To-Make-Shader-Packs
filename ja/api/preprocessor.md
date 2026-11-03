# プリプロセッサ

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブバリデータから復元)

条件付きコンパイルに使えるのは `#define 名前` (値なし) / `#ifdef` / `#ifndef` / `#else` / `#endif` のみです。`#` は行の先頭に置きます (関数の中でも可)。フラグ名の照合は大小文字を区別しません。`#ifdef` に誤った名前を書くと、エラー文言が正式一覧を表示します。

## 定義されるマクロ (3種)

| マクロ | 定義される条件 | 主な用途 |
|---|---|---|
| `BLOXD_STRICT` | strict ゲームのバリアント (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` として vertex フック全体と `discard` を囲む |
| `BLOXD_ALPHA` | `BloxdSurface.alpha` が存在するバリアント — 全 liquid + 非 strict の terrain / model | `alpha` を触るコードを囲む |
| `BLOXD_SCENE_DEPTH` | 全 liquid バリアント | `bloxdOpaqueBehind()` の呼び出しを囲む |

## マクロ×バリアントの行列

| バリアント | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

地形 / 液体 / モデルの違いは**マクロではなく別プログラム**です。`#ifdef BLOXD_TERRAIN` のような分岐は書けません (そのようなマクロは存在しない)。

## 廃止されたマクロ

- **`BLOXD_LIGHTING`** — v5 で廃止。ライティング状態はコンパイル時ではなく実行時の [`bloxdLit()`](lighting.md#bloxdlit--ライティングのゲート) で判定します。使用すると検証時に専用メッセージが出ます:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

v4 パックの移植パターン:

```wgsl
// v4 (v5 では検証失敗)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (移植済み)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... ライティングが有効なときの処理
}
```

## 書き方の例

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain では allow の時だけ alpha がある
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex は必ずこのガード付きで
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## マクロが構造体の形を変える

条件付きフィールドはマクロと連動します:

- `#ifdef BLOXD_ALPHA` 内でのみ `BloxdSurface.alpha` が存在する
- `#ifdef BLOXD_SCENE_DEPTH` 内でのみ `bloxdOpaqueBehind()` が呼べる

詳細は [入出力構造体](structures.md#条件付きフィールドとマクロの関係) を参照。

## 関連

- バリアントの数と意味 → [Getting Started: バリアントとガード](../getting-started/variants.md)
- バリデータがマクロを検証する仕組み → [エンジン内部: Shader Validation](../internals/shader-validation.md)
