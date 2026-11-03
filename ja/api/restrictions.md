# 制限と予約名

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Verified (v4 実測の制限が v5 でバイト同一であることを再確認)

パックが書ける言語機能と、名前の予約規則の全体です。

## 使えるもの

- WGSL の組み込み関数 (`sin`、`mix`、`clamp`、`distance`、`smoothstep`、`reflect`、`select` 等)
- 自作の `fn` / `struct` / `const` / `alias` / `var<private>`、関数内の `let`・制御構文 (if/for/while/switch 等)
- 導関数 (`dpdx` / `dpdy` / `fwidth`) は surface/light フック (フラグメント段) でのみ使用可。vertex では不可
- `const` 配列 (カラーパレットLUT等)、ポインタ (`ptr<function, T>`)、行列 (`mat3x3f` 等) も使用可
- フラグ定義 `#define 名前` (値なし) + `#ifdef` による条件分岐
- `override` 不可につき `const_assert` は…(使用不可。下記禁止リスト参照)

## 禁止・注意

- **テクスチャ不可 (直接)**: `texture_*` / `sampler` 型は宣言できない。アトラス読み取りは [`bloxdTexel`](texture-api.md) のみ。*"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` は strict で禁止** (`#ifndef BLOXD_STRICT` で囲む)
- `@属性` / `enable` / `requires` / `override` は禁止。`enable f16;` が書けないため **f16系の型は使えない**
- `@builtin` 属性も禁止のため、`fragCoord` (画面座標) や `vertex_index` は取得できない
- **モジュールスコープの `let` は使わない** (`const` か `var` を使う)
- `atomic` は使えない
- **出力構造体の直接構築禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否。必ず `bloxdDefault*` から
- 未初期化の `var x: BloxdSurface;` (型注釈だけの宣言) も検証エラー
- フックの引数は読み取り専用 (書き換えはコピーを作ってから)
- `#define` に値は書けない (名前のみ)

## 予約名

### bloxd 接頭辞 (一般則)

**`/ ^bloxd/i` に一致するすべての識別子 (大小文字無視) が予約**です。自分の識別子に `bloxd` 接頭辞は使えません。唯一の例外が9つのフック関数名です。

バリデータの文言 (逐語):

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### bloxdSp* 名前空間 (46シンボル)

生成器が注入でき、ゆえに再宣言できないシンボル群 (v5 で 27 から 46 へ増加):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

新しい名前は v5 の機能に直接対応します: `bloxdSpFlags` (フラグ構造体の経路)、`bloxdSpEnchant` / `bloxdSpItemLocalPosition` (新入力)、セル・サンプリングのテクスチャパック経路、回転連鎖、拡張フックの生成ローカルなど。**パックレベルの予約則はこのリストより広い** (`/^bloxd/i` に一致するすべて) なので、この一覧を暗記する必要はありません — `bloxd` で始まる名前を書かなければ安全です。

### テクスチャ名

`bloxdTextureId` で始まる識別子はテクスチャ名定数として解決を試みられます (詳細は [テクスチャAPI](texture-api.md#bloxdtextureid-テクスチャ名定数))。

## v5 で導入された自動書き換え

- **Y 導関数の自動符号反転**: アナライザは `dpdy`、`dpdyCoarse`、`dpdyFine` のすべての呼び出しを `(-dpdy(...))` に書き換えます (バリデータのトークン書き換えパスで計測。dpdy 系が反転セットとして明示列挙)。スクリーン空間の y 軸は下向きのため、この反転によって «上方向への変化率» が直観と一致します。`dpdy(h)` は «h は上へ行くとどう変わるか» という意図で書けばよく、出力コードが反転を引き受けます。`dpdx` と `fwidth` 系は手つかずです

## 診断メッセージの実例

予約名・機能制限に触れたときの実メッセージ (ライブバリデータから):

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."* (vertex フックから特殊関数を呼んだとき)
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## 関連

- エラーからの復帰手順 → [Troubleshooting](../troubleshooting/compilation.md)
- バリデータの内部 → [Engine Internals: Shader Validation](../internals/shader-validation.md)
