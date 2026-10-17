[マニュアルに戻る](README.md)・[次の部 →](02-api.md)

# 第一部: 作り方

## 1. 概要と前提

- シェーダーパックは **WebGPU レンダラー専用**。パック導入中は設定の WebGPU レンダラーが強制オンになる
- パックは **WGSL の制限付きサブセット**で記述する。対象は**地形 (terrain) と液体 (liquid)** の見た目のみ
- できること: 色・透明度・発光の変更、照明の組み直し、投影風の影 (R9.12)、(一部ゲーム限定で) 頂点移動
- できないこと: テクスチャの追加・サンプリング、ポストプロセス (ブルーム等)、太陽と一緒に回るピクセル精度の影 (シャドウマップ) と本物の反射 (SSR) の新設、空やエンティティへの適用
- できる (が見落とされがちな) こと: **`skyLight` (ボクセル天空遮蔽) を使った投影風の影** — 木の下・屋根の下を明確に暗くできる (R9.12)。ブロックを壊すと LightEngine が即再計算して影もリアルタイムに追従する
- **大多数のゲームは strict モード** (頂点移動・`discard` 禁止)。一般配布するパックは strict で動く作りにする

## 2. 最短手順

1. フォルダを作り、`pack.json` と `.wgsl` ファイルを置く
2. ゲームの設定 → Shader Pack から zip またはフォルダを読み込ませる
3. エラーが出たら直して再読み込み ([第五部](05-troubleshooting.md))
4. 対応ゲームで動作確認する
5. 完成したら zip に固めて配布する

## 3. パックの構成

- **配布形態**: `.zip` 1つ、またはフォルダ (フォルダ読み込みはデスクトップ版ブラウザのみ)
- **中身**: `pack.json` 1つ (パックの最上位に配置。大文字小文字は区別されない) + `.wgsl` ファイル 1〜256個
- 複数の `.wgsl` は連結されて1モジュールとして扱われるため、分割・ディレクトリ分けは自由。ファイル名に制約は無い。`.wgsl` 以外のファイル (README等) は無視される
- ZIP化のコツ: 全ファイルが共通する 1 階層のルートフォルダに収まっている zip は、そのプレフィックスが自動的に剥がされる (macOS の「フォルダを圧縮」でできる zip もそのまま OK)。ただしルート階層に余分なファイルが混ざると最上位判定を失うため、確実なのはフォルダの中に入って `pack.json` と `.wgsl` を直接指定して固めること (`pack.json` がZIP直下に来ることを確認する)

| 項目 | 上限 |
|---|---|
| zip サイズ / エントリ数 | 32MB / 1024 |
| pack.json サイズ | 64KB、UTF-8 |
| .wgsl 合計サイズ | 256KB、UTF-8 |
| zip 形式 | zip64・分割・暗号化は不可 |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| フィールド | 必須 | 説明 |
|---|---|---|
| `apiVersion` | 必須 | `2` と完全一致させる。`1` のパックは `shaderPack:loadWrongApiVersion` で拒否される |
| `name` | 必須 | 空文字不可。設定画面に表示される |
| `author` | 任意 | 省略可。文字列以外 (数値等) はエラー |

その他のフィールドは無視される。

## 5. 最小テンプレート

`pack.json` と以下の `pack.wgsl` だけで動くパックになる:

```wgsl
// ほんのり暖色にする最小パック
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

守るべき作法:

- 出力構造体は**直接構築しない** (`BloxdSurface(...)` はエラー)。必ず `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` から作ってフィールドを書き換える。例外として light フックの第 1 引数 `s: BloxdSurface` は出力と同型なので `var out = s;` で始めることもできる
- 未初期化の `var x: BloxdSurface;` (型注釈だけの宣言) もエラーになる
- フックの引数は**読み取り専用**。書き換えたい場合は `var sv = s;` のようにコピーしてから
- 自分の識別子に `bloxd_` 接頭辞は使えない (6つのフック名を除く)
- 定数は `const` で書く (`#define` に値は書けない)

## 6. 6つのフック

すべて任意。シグネチャは型まで正確に一致させる (引数名は自由)。

| フック | 役割 |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | 地形の頂点移動。**strict では使用不可** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | 地形の色・透明度・発光。`s.colour` はテクスチャ×頂点色 |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | 地形の最終色。**フラグメントの最終段**で呼ばれ、返り値がそのまま最終色になる |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (同型) | 液体版。`alpha` は液体の透過率として効く |

フォールバックの規則:

- liquid フックが未定義なら **terrain の同名フックが使われる** (逆は無し)。surface だけ書けば液体にも同じ効果がかかる
- light フックが未定義なら既定動作 (`engineColour + emission × fogVisibility`) になる
- `engineColour` を捨てて素材色から組み直した場合は、フォグを自分でかけ直すこと: `mix(l.fogColour, col, l.fogVisibility)`。emission を足すときは `fogVisibility` を掛けてから

## 7. 8バリアントとガード

書くコードは1つだが、`{strict, allow} × {照明on, 照明off} × {地形, 液体}` の **8通りすべてでコンパイルが通る必要がある**。
条件分岐に使えるのは `#define` (値なし) / `#ifdef` / `#ifndef` / `#else` / `#endif` のみ。`#` は行の先頭に置く (関数の中でも可)。

| ガード | 意味 | 用途 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | strict 以外 (allow) のみ | vertex フック全体、`discard` を囲む |
| `#ifdef BLOXD_LIGHTING` | 照明オン時のみ | `blockLight`・`skyLight`・`ambientLightColour` 等を触るコードを囲む。**共用ヘルパー関数 (モジュールスコープのfn) は関数ごと囲む** (呼び出し側だけでは不十分) |
| `#ifdef BLOXD_ALPHA` | `alpha` フィールドがある場合 (液体は常に・地形は allow のみ) | `alpha` を触るコードを囲む |

## 8. 使える言語機能・禁止事項

使えるもの:

- WGSL の組み込み関数 (`sin`、`mix`、`clamp`、`distance`、`smoothstep`、`reflect`、`select` 等)
- 自作の `fn` / `struct` / `const` / `alias` / `var<private>`、関数内の `let`・制御構文 (if/for/while/switch 等)
- 導関数 (`dpdx` / `dpdy` / `fwidth`) は surface/light フック (フラグメント段) でのみ使用可。vertex では不可
- `const` 配列 (カラーパレットLUT等)、ポインタ (`ptr<function, T>`)、行列 (`mat3x3f` 等) も使用可
- フラグ定義 `#define 名前` + `#ifdef` による条件分岐

禁止・注意:

- **テクスチャ不可**: `texture_*` / `sampler` 型は使えない。質感はハッシュノイズ等の手続き的計算で作る
- **`discard` は strict で禁止** (`#ifndef BLOXD_STRICT` で囲む)
- `@属性` / `enable` / `requires` / `override` は禁止。`enable f16;` が書けないため **f16系の型は使えない**
- `@builtin` 属性も禁止のため、`fragCoord` (画面座標) や `vertex_index` は取得できない
- **モジュールスコープの `let` は使わない** (`const` か `var` を使う)
- `atomic` は使えない
- 座標は noaローカル座標。ワールド座標にするには `bloxdOriginOffset()` を足す。ブロック座標は `bloxdFaceBlock(position, normal)`

## 9. 検証・動作確認・配布

読み込むとゲーム側で次の順に検査される:

1. ローダー制限チェック (3章の上限)
2. 静的コンパイル (8バリアントすべて)
3. ブラウザ WebGPU による実コンパイル検証 (静的検証は型検査が完全ではないため、ここで落ちる書き方がある。8章の罠を避けること)

手順:

1. 設定 → Shader Pack から zip / フォルダを読み込む
2. ステータスを確認する。「Ready to use」になれば成功。「Saved, but it won't run until you fix these errors...」の場合はエラー一覧 (file:行 + バリアント付き) を直して再読み込み
3. 読み込み後はページの再読込で有効化される。URLパラメータやlocalStorageにレンダラーオーバーライドが残っているとパックが起動を拒否されるため、取り除いてから再読み込みする
4. まず制限の緩いゲームで確認し、次に strict のゲーム (大多数はこちら) で確認する。頂点移動を使う場合は allow のゲームでのみ動作する
5. 配布時は `pack.json` を最上位にした zip に固める (3章の上限内であること)。パックの差し替えは同じ画面で読み込み直すだけ、削除は Remove Pack で行う。ゲーム更新後の再検証はページ読み込み時に自動で行われる

[マニュアルに戻る](README.md)・[次の部 →](02-api.md)
