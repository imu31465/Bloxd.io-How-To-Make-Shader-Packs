# バリアントとマクロガード

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Analyzed

## 6バリアント

書くコードは1つですが、コンパイルは `{strict, allow} × {terrain, liquid, model}` の **6通りすべて**で通る必要があります。ローダは読み込み時にこの6バリアントを一度に検証します。

v4 以前の「照明 on/off」軸は廃止されました (v4 は8バリアントでした)。ライティング状態はコンパイル時分岐 (`#ifdef BLOXD_LIGHTING`) ではなく、実行時の [`bloxdLit()`](../api/lighting.md) 関数で問い合わせます。

| バリアント | 例 | 定義されるマクロ |
|---|---|---|
| `allow.terrain` | 頂点移動可のゲームの地形 | `BLOXD_ALPHA` |
| `allow.liquid` | 頂点移動可のゲームの水 | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | 頂点移動可のゲームのモデル | `BLOXD_ALPHA` |
| `strict.terrain` | strict ゲームの地形 | — |
| `strict.liquid` | strict ゲームの水 | `BLOXD_SCENE_DEPTH` |
| `strict.model` | strict ゲームのモデル | — |

## 条件分岐に使えるもの

条件分岐に使えるのは `#define 名前` (値なし) / `#ifdef` / `#ifndef` / `#else` / `#endif` のみ。`#` は行の先頭に置きます (関数の中でも可)。

| ガード | 定義される条件 | 主な用途 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | strict 以外 (allow) のバリアントのみ | vertex フック全体、`discard` を囲む |
| `#ifdef BLOXD_ALPHA` | `alpha` フィールドが存在するバリアント (全 liquid + 非 strict の terrain/model) | `alpha` を触るコードを囲む |
| `#ifdef BLOXD_SCENE_DEPTH` | 全 liquid バリアント | `bloxdOpaqueBehind()` の呼び出しを囲む |

`BLOXD_LIGHTING` は v5 で**廃止**されました。使用すると検証時に専用メッセージが出ます: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — ライティング状態は実行時の `bloxdLit()` で分岐します。

## strict ゲームとの契約

大多数のゲームは strict モードです (頂点移動・`discard` を禁止)。無防備な vertex フックは `<hook> moves terrain, which strict games prevent.` を報告し、到達可能な `discard` は `discard makes terrain see-through, which strict games prevent.` を報告します。いずれもその strict ゲームで**全フックを無効化**するため、vertex フックは必ず `#ifndef BLOXD_STRICT` で括ります。

ゲームごとの適用モード (`shaderPackPolicy`) の内部仕様は [エンジン内部と研究](../internals/policy.md) を参照してください。
