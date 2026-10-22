# Bloxd.io シェーダーパックの作り方 (完全版)

Bloxd.io のシェーダーパック (WebGPU レンダラー専用) を自作・配布するための手順書。

> 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる。  
> 本書はAIの支援を受けて作成されており、内容の正確性は保証されない。実際のゲーム動作で確認すること。  
> 最終レビュー: 2026-10-20 (バンドル比較で v3 本番ロールアウトを確認。フック呼び出し・フォグ・深度・blockFlags の内部仕様を本番ビルドから復元 — 第九部 §49〜§54)。専用の公開公式WGSL APIリファレンスを確認できていないため、API説明とレシピは読み込み画面・実機コンパイルで継続検証すること。  
> シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パックは純粋な WGSL  
> (JS 実行・通信不可) のため、通常の記述で危険なことは起きない。

[マニュアルに戻る](README.md)・[次の部 →](02-api.md)

# 第一部: 作り方

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 1. 概要と前提

- シェーダーパックは **WebGPU レンダラー専用**。パック導入中は設定の WebGPU レンダラーが強制的にオンになる
- パックは **WGSL の制限付きサブセット**で記述する。対象は**地形 (terrain) と液体 (liquid)** の見た目のみ
- できること: 色・透明度・発光の変更、照明の組み直し、投影風の影 (R9.12)、(一部ゲーム限定で) 頂点移動
- できないこと: テクスチャの追加・サンプリング、ポストプロセス (ブルーム等)、太陽と一緒に回るピクセル精度の影 (シャドウマップ) と本物の反射 (SSR) の新設、空やエンティティへの適用
- できる (が見落とされがちな) こと: **`skyLight` (ボクセル天空遮蔽) を使った投影風の影** — 木の下・屋根の下を明確に暗くできる (R9.12)。ブロックを壊すと LightEngine が即座に再計算し、影もリアルタイムに追従する
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
- 複数の `.wgsl` は連結されて1モジュールとして扱われるため、分割・ディレクトリ分けは自由。ファイル名に制約は無い。連結は**パス名の辞書順**で行われる (モジュールスコープの宣言は順序非依存なので通常は無関係だが、`var` の初期化順序に依存する書き方をした場合のみ効く)。`.wgsl` 以外のファイル (README等) は無視される
- ZIP化のコツ: 全ファイルが共通する 1 階層のルートフォルダに収まっている zip は、そのプレフィックスが自動的に剥がされる (macOS の「フォルダを圧縮」でできる zip もそのまま OK。`__MACOSX` / `._` で始まるファイル / `.DS_Store` 等の OS ゴミは自動で除外される)。ただしルート階層に余分なファイルが混ざると最上位判定を失うため、確実なのはフォルダの中に入って `pack.json` と `.wgsl` を直接指定して固めること (`pack.json` がZIP直下に来ることを確認する)

| 項目 | 上限 |
|---|---|
| zip サイズ / エントリ数 | 32MB / 1024 |
| pack.json サイズ | 64KB、UTF-8 |
| .wgsl 合計サイズ | 256KB、UTF-8 |
| zip 形式 | zip64・分割・暗号化は不可。圧縮は store / deflate のみ、重複パスは不可 |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| フィールド | 必須 | 説明 |
|---|---|---|
| `apiVersion` | 必須 | `3` と完全一致させる。`1`/`2` のパックは読み込み時に `shaderPack:loadWrongApiVersion` で拒否される — 移行は [第九部](09-apiv3.md) を参照 |
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
2. 静的コンパイル (全8バリアント)
3. ブラウザでの WebGPU を用いた実コンパイル検証 (静的検証は型チェックが不完全なため、この段階で失敗する記述が存在する。8章の罠を回避すること)

手順:

1. 設定 → Shader Pack から zip またはフォルダを読み込む
2. ステータスを確認する。選択直後は「Ready. Reload the page to use it.」が表示され、ページ再読み込み後に「Ready to use」であれば成功。「Saved, but it won't run until you fix these errors...」の場合は、エラー一覧 (ファイル:行 + バリアント) を修正して再読み込みする
3. 読み込み後はページの再読み込みで有効化される。URLパラメータや localStorage にレンダラーオーバーライドが残っているとパックの起動が拒否されるため、それらを除去してから再読み込みする
4. まず制限の緩いゲームで確認し、次に strict モードのゲーム (大多数はこちら) で確認する。頂点移動を使用する場合は、allow 指定のあるゲームでのみ動作する
5. 配布時には `pack.json` をルートに配置した zip に圧縮する (3章のサイズ上限内であること)。パックの差し替えは同じ画面から読み込み直せるが、反映にはページ再読み込みが必要である (手順2-3)。削除は Remove Pack で行う。ゲーム更新後の再検証は、ページ読み込み時に自動で行われる

[マニュアルに戻る](README.md)・[次の部 →](02-api.md)

[← 前の部](01-making.md)・[マニュアルに戻る](README.md)・[次の部 →](03-recipes.md)

# 第二部: API リファレンス

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 10. エンジンヘッダ (パックコードの先頭に自動付与される)

以下はエンジンが自動挿入するコードである (パック側で再宣言できない)。`#ifdef` で囲まれた部分はバリアントにより存在が変わる。

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // time が 0 に戻る周期 (秒)

fn bloxdTime() -> f32;               // 秒。3600 秒で 0 に戻る
fn bloxdOriginOffset() -> vec3i;     // 整数ブロック。noa-local + これ = ワールド座標
fn bloxdEyePosition() -> vec3f;      // カメラ位置 (noa-local)
fn bloxdSunDirection() -> vec3f;     // 太陽方向 (単位ベクトル、地球スカイボックス時のみ非ゼロ)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local → ワールド座標
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // この面が属するワールドブロック座標
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // 面が属するブロックの ID (flat 補間で全域一定)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // 面が属するブロックの ID (flat 補間で全域一定)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // エンジンのライティング結果 (emission・フォグ適用前)
    engineColour: vec3f,       // フォグ適用後 = bloxdApplyFog(litColour, l)。emission は含まない
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (全バリアントに存在。unlit では 0)
    skyLight: f32,             // voxel sky light, tone-mapped (全バリアントに存在。unlit では 1)
    ambientLightColour: vec3f, // 全バリアントに存在 (unlit では白)
    skyLightColour: vec3f,     // 全バリアントに存在 (unlit では白)
    heldLight: vec3f,          // held light here (全バリアントに存在。unlit・圏外では 0)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (v1 の fogFactor から改名)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // 面が属するブロックの ID (flat 補間で全域一定)
}

struct BloxdLight {
    colour: vec3f,
}

// 液体バリアント・surface / light フック限定
struct BloxdOpaqueBehind {
    found: bool,       // 奥に不透明な面が無い (空) のとき false
    position: vec3f,   // 奥の不透明面の位置 (noa-local)
    distance: f32,     // 視点からの距離
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

解釈の要点:

- `bloxdTime()` は3600秒で折り返す経過時間 (`bloxdTimeWrap`)。ゲーム内の昼夜時計と同期しているとは限らず、bind group の stage 可視性が VERTEX|FRAGMENT のため **vertex フックからも呼び出せる**。
- `bloxdSunDirection()` は太陽が存在するときの単位ベクトルで、空に太陽がない場合はゼロ。**月は常に `-bloxdSunDirection()` にある** (エンジンが月の位置を太陽の正反対に計算するため)。現行ビルドでは昼夜サイクルの実装はなく、太陽・月・星はゲーム実行中に移動しない (表示の ON/OFF は `dayNightSunOpacity` 等の不透明度設定のみ)。既定の地球空では太陽はほぼ `(−0.56, 0.81, −0.18)` (高度約 54°) に静止する。**零ベクトルを `normalize` に渡さないこと** — `dot(d, d) < 1e-8` で太陽の不在を検査し、定数方向へフォールバックするのが安全 ([第七部](07-internals.md) §28 参照)
- ※補足: 従来「ゼロ時に月の方向として再利用できない」と書いていたが、方向自体は `-bloxdSunDirection()` で得られる。外部配布するパックは `sunPresent` で分岐する書き方にしておくのが安全 (青い環境光の擬似表現については R2、方向性月光については[第七部](07-internals.md) R-A 参照)
- `emission` は照明計算の後に加算され、**`fogVisibility` で減衰される** (defaultLight の実装は `engineColour + emission × fogVisibility`。完全に霧に沈む遠景では発光も消失する)。
- **フォグ適用順序**: フラグメント内の処理順は ① 照明・発光の合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light フック呼び出し → ⑤ return。したがって **engineColour はフォグ適用済み**で届き、**light フックの返り値がそのまま最終色** (フック後にフォグは再適用されない)。
- **fogVisibility の定義元**: ビュー空間距離 (頂点単位で計算・補間)。linear モードでは `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (0..1 でクランプ)。
- **fogMode == 0 のとき**: `fogColour` には `vec3f(0.0)` (黒) が渡される。fogColour の色味で時間帯を推定するコードは注意が必要。
- **現行ビルドの実フォグ設定**: **linear 固定**。`fogStart = 描画チャンク距離`、`fogEnd = +1 チャンク` (地平線のみ)。フォグオフ設定では 100 / 101 チャンクに設定され実質無効。既定フォグ色は RGB (183, 191, 195)。
- **`skyLight` / `blockLight` / `heldLight` は「リフト曲線」通過後の値**で届く。ヘッダコメントの `tone-mapped` がこれを指す: エンジンはフラグメントで必ず `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を掛けてからパックに渡す。生の voxel 値 (n/15) ではなく、例えば木の下 (生値 0.87) は **0.97 に持ち上げられて届く**。滑らかな階調用途ならそのままで良いが、**しきい値で日向/影を分離したい場合は逆変換 `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` で生値を復元してから使う** (R9.12)。
- `skyLight` の実体は「その場所から空が見えるか」のボクセル遮蔽データ (= 影マップ) であり、単なる明るさパラメータではない (15章「影の真実」)。
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`、64B) は**ヘッダ関数経由でのみ使用する**。パックから直接参照しない。stage 可視性は VERTEX|FRAGMENT のため、ヘッダ関数はフックの外のモジュールスコープ関数や vertex フックからも呼び出せる。深度テクスチャ (binding 1) は FRAGMENT 専用のため、`bloxdOpaqueBehind()` は surface / light フック限定である。
- **`litColour` が起点に使える**: v1 ではフォグ済みの `engineColour` しかなかったため、自前の大気表現で二重フォグになりがちだった。v2 ではフォグ前・emission 前の `litColour` から始め、`bloxdApplyFog()` で自分のペースでフォグを掛け直せる。
- **`blockId` でブロック種別を見分けられる**: テクスチャ色に依存しない識別。ただし ID とブロック種の対応表はエンジン内部のため、どの ID が何ブロックかはワールド内で実測するか、参考データ [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) の一覧で調べる ([第八部](08-apiv2.md)参照)
- **構造体の直接構築は禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` から変更する、または入力のコピーを使う。

## 11. バリアント一覧

| バリアント | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + 照明off + 地形 | – | – | ✓ |
| allow + 照明off + 液体 | – | – | ✓ |
| allow + 照明on + 地形 | – | ✓ | ✓ |
| allow + 照明on + 液体 | – | ✓ | ✓ |
| strict + 照明off + 地形 | ✓ | – | – |
| strict + 照明off + 液体 | ✓ | – | ✓ |
| strict + 照明on + 地形 | ✓ | ✓ | – |
| strict + 照明on + 液体 | ✓ | ✓ | ✓ |

バリアントごとにヘッダ構造体の形も変わる (strict では `BloxdVertex` 自体が無い、照明off では `blockLight` 等が無い、strict地形では `alpha` が無い)。

定義される記号は公式には 4 種である (上表の 3 種 + `BLOXD_SCENE_DEPTH` — [第八部](08-apiv2.md) §35)。地形 / 液体の違いは記号ではなく**別プログラム**であるため、`#ifdef BLOXD_TERRAIN` のような分岐は書けない。フラグ名の照合は大小文字を区別しない。`#ifdef` に誤った名前を書くと、エラー文言が 4 種の正式一覧を表示する。フック関数が注入されるのも地形・液体の 2 プログラムのみで、パックはエンティティやパーティクル等の他の描画に影響を与えられない。

## 12. 骨格チートシート

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // ← 直接構築は禁止。必ず default から
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain では allow の時だけ alpha がある
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // 照明 on だけの入力はガードする
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex は必ずこのガード付きで
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

常に意識する5点: 8バリアントすべてで通す / strict が大多数 / テクスチャ不可 / フック引数は読み取り専用 / `let` はモジュールスコープに置かない。

[← 前の部](01-making.md)・[マニュアルに戻る](README.md)・[次の部 →](03-recipes.md)

[← 前の部](02-api.md)・[マニュアルに戻る](README.md)・[次の部 →](04-realism.md)

# 第三部: レシピ集

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

- [R1. 色のレシピ (surface)](#r1-色のレシピ-surface)
- [R2. 照明のレシピ (light)](#r2-照明のレシピ-light)
- [R3. 発光のレシピ (emission)](#r3-発光のレシピ-emission)
- [R4. 座標のレシピ (ワールド/ブロック/視線)](#r4-座標のレシピ-ワールドブロック視線)
- [R5. 時間のレシピ (アニメーション)](#r5-時間のレシピ-アニメーション)
- [R6. 液体のレシピ](#r6-液体のレシピ)
- [R7. 頂点のレシピ (allow 限定)](#r7-頂点のレシピ-allow-限定)
- [R8. 数式小技集](#r8-数式小技集)
- [R9. リアル系レシピ](#r9-リアル系レシピ)

---

すべての断片は8バリアントを通す前提のガード付きで書いてある。そのままコピペして定数をいじるだけで使える。

## R1. 色のレシピ (surface)

### 単色ティント (最も基本)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 彩度ブースト / デサチュレート

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 で鮮やかに / -1.0 で完全モノクロ
```

### 色温度 (暖色 ⇄ 寒色)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 暖かい (赤強め), -1.0 = 寒い (青強め)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### ビンテージ / セピア

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 高度グラデーション (低い土地を暖かく)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 で 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 面の向きで塗り分け (上向き=明るく、壁=暗く)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 床 1 / 壁 0 / 天井 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 壁はやや暗く天井も暗く
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### ポスタリゼーション (色数を減らす)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 照明のレシピ (light)

### コントラスト S 字カーブ

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 距離ヘイズ (独自フォグ)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ブロックから 192 ブロックで 0..0.35 のフォグを自前で足す
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜 (skyLight 駆動の青シフト + 灯りの保護)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### 洞窟を真っ暗に (skyLight が無い所を更に暗く)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` はリフト後の値 (10章) なので、浅い遮蔽 (木の下など。生値 0.87 → リフト後 0.97) はこの方法ではほとんど暗くならない。洞窟 (生値 0) には効果がある。「木陰」をはっきりさせたい場合は R9.12 のリフト逆変換 + しきい値方式を使う。

### 夜の青い環境光 (月の方向を使わない擬似表現)

> このAPIでは、空に太陽がないとき `bloxdSunDirection()` はゼロになる。以下は方向性のある月光ではなく、空が暗いときにごく弱い青い環境光を足すだけの疑似表現。なお月の方向自体は `-bloxdSunDirection()` で得られる (昼夜サイクルワールド限定。[第七部](07-internals.md) R-A)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### 夕暮れの暖色化 (太陽高度で色を寄せる)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平線で1/真上で0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### エンジン出力の完全置き換え (最も単純な再照明)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) の直接構築は禁止。default から作って colour を書き換える
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (エンジンの照明結果) を捨てて「素材の色 × 自分で計算した明るさ」に置き換える
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour を捨てたのでフォグをかけ直す (必須)
    out.colour = col + s.emission * l.fogVisibility;   // emission も自分で足す (必須)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 発光のレシピ (emission)

> `emission` は照明計算後に加算されるが、既定処理では **`fogVisibility` が掛かって減衰する。つまり完全に霧に沈む遠景では emission も消える。遠景でも光らせたい成分は emission に足さず、light フック内で `out.colour += ...` として直接加算する** (engineColour はフォグ済みなので、遠景では霧色の上に光が乗る)

### 灯りの脈動 (松明が息をする)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 発光鉱石っぽい処理 (明るい素材を光らせる)

```wgsl
// surface 側: 素材が明るい (白い) ほど emission を強調する
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 蛍の群れもどき (時間で空間を漂う光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数個の「光の玉」がゆっくり移動する。distance の逆数で発光させる
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 座標のレシピ (ワールド/ブロック/視線)

### ワールド座標

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### ブロック座標

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### 市松模様 (ブロック単位)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 or 1
out.colour *= mix(0.96, 1.04, checker);
```

### ブロック単位の擬似ランダム (ハッシュ)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 用途: 草色のバリエーション、石の色ムラなど
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 視線ベクトルとリムライト

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 視線角度 (フレネルもどき — 液体向け)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 真上から 1 / 浅い角度 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 時間のレシピ (アニメーション)

> `bloxdTime()` は 3600 秒 (1 時間) で折り返す。ただし、これはシェーダー内の経過時間であり、ゲーム内の太陽や昼夜サイクルと同期するとは限らない。視覚的な周期アニメーションには利用できるが、実際の夜間判定には `bloxdSunDirection()` やライティング入力を優先すべきである。

### 昼夜サイクル (1 時間で 1 日)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 の1時間周期。ゲーム内の昼夜と同期するとは限らない
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### ゆらぎ (複数 sin の重ね合わせ)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### バンドが流れるオーロラ / 蛍光の帯

```wgsl
// XZ 位置と時間に基づき、3 色を混合する
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. 液体のレシピ

### 水面のさざ波 (色の明滅)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid は常に BLOXD_ALPHA — ガードは習慣として
    #endif
    return out;
}
```

### 高度を使った透明度の疑似変化 (本当の浅瀬判定ではない)

> v1 ではシーン深度や水底の位置を参照できず、このAPIだけでは実際の水深を計算できなかった。v2 では液体限定で `bloxdOpaqueBehind()` により奥の不透明面までの厚みが測れる ([第八部](08-apiv2.md) R-E)。以下はそれを使わない旧来の疑似演出で、`s.position.y` はローカル座標なので、そのまま使うと座標原点の変化で効果がずれる。ワールド高度を使う場合は `bloxdWorldPosition()` で変換する。以下はワールド高度を使ってアルファを変えるだけの疑似演出で、海岸線や水底に沿った浅瀬表現ではない。`packWaterReferenceY` はワールド高度に合わせて調整する。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低高度では薄く、高高度では元のアルファ値に近づける。ゲーム内で向きを確認する必要がある。
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 水中から見た水中霧

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 液体だけに効くパック (地形無傷の構成)

```wgsl
// terrain_* フックは一切記述しない。これにより:
//  - terrain バリアント = フック無し = 地形はエンジンの既定設定のまま
//  - liquid バリアント  = liquid_* フックのみ有効
```

## R7. 頂点のレシピ (allow 限定)

> すべて `#ifndef BLOXD_STRICT` で囲むこと。
> 実行条件の詳細 (allow のタイトル一覧・Custom Games は strict) は本編 §30 参照 → [§30 ゲーム別の適用モード](07-internals.md#30-ゲーム別の適用モード-shaderpackpolicy)

### 草が風に揺れる (上端だけ動かす)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 垂直面のみ
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面の波 (上面のみ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脈動する地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 法線方向にわずかに膨張収縮
    return out;
}
#endif
```

### 波打つ地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. 数式小技集

```wgsl
// 0..1 を滑らかに段階化 (n 段)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2 段階のしきい値 (トゥーン影)
let shadow = smoothstep(0.35, 0.37, level);   // しきい値±0.02 で階段を作る

// 3 段階トゥーン
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// ルーマ (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 円滑なパルス
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「ゆっくりな位相」に変換
let phase = t * 0.15;
```

## R9. リアル系レシピ

> 「バニラの見た目を素材から組み直す」ための物理系レシピ集。前提:
>
> 1. **light フックはフラグメントの最終段で呼ばれる**。返す colour がそのまま最終色。**自分でフォグをかけ直す必要がある** (R9.10)  
> 2. **エンジン既定の照明は掛け算のみ**。スペキュラ / フレネル / 暖色-冷色分離 / 半球環境光はゼロから実装可能  
> 3. `l.engineColour` は完成色 (フォグ済み)。これを破棄し `s.colour` (アルベド) から再構築するのが本格的な手法  
> 4. テクスチャ使用は禁止 → ディテールはすべて**手続き的** (ハッシュ/ノイズ) で生成 (R9.8)

### R9.1 暖色トーチ × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // フォグ掛け直し
    out.colour = col + s.emission * l.fogVisibility;                 // emission 再加算
    #endif
    return out;
}
```

### R9.2 太陽スペキュラ (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // ハーフベクトル
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick フレネル

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 縁の薄い明るみ
    #endif
    return out;
}
```

### R9.4 半球環境光 (上=空 / 下=地面の跳ね返り)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下: 跳ね返り
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上: 空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // フォグ掛け直し
    out.colour = col + s.emission * l.fogVisibility;                        // emission 再加算
    #endif
    return out;
}
```

### R9.5 ACES フィルミック (Narkowicz 近似)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 露出
    return out;
}
```

### R9.6 大気遠近法 (距離で彩度が落ちる「空気感」)

> 注意: 霞の色に輝度を持ち上げる処理 (`normalize` 等) を適用すると、霧が暗いシーンで「明るい白い靄」が浮かび、  
> engineColour (フォグ済み) にさらに霧色を加算すると二重フォグで白濁する。**空気感は彩度の低下のみで表現**するのが安全。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 距離減衰 (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 彩度だけ落とす (輝度は不変)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 波法線 + 太陽グリント (水面の「太陽の道」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 高さ h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 手続き的マイクロバンプ (テクスチャ禁止の回避策)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ブロック内ローカル座標
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 洞窟の非線形暗化 + 灯りの保護

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // 灯りのある所は持ち上げ
    out.colour *= mix(keep, 1.0, sky * sky);     // 暗化は非線形 (2 乗)
    #endif
    return out;
}
```

### R9.10 フォグをかけ直す定石 (engineColour を捨てたとき必須)

> `l.fogVisibility` を `max(l.fogVisibility, 0.25)` のように下限を設けることで、「これ以上濃くしない」調整が可能になる。
> (0.0 = エンジン準拠 / 0.3〜0.5 = 遠景クリア)。
> なお、エンジンのフォグは地平線専用の線形フォグ (描画距離付近のみ) であり、中距離の霧はパック側で生成する必要がある。
> 実際のフォグ設定 (実装照合済み): 線形固定 / `fogStart` = 描画チャンク距離 / `fogEnd` = +1 チャンク / フォグオフ時は 100〜101 チャンクで実質無効 / デフォルト色 RGB (183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // ← フォグ再現 (0.15=薄めの下限)
    col += s.emission * l.fogVisibility;            // ← emission もフォグ済みで
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 シネマ-grade (影は寒色 / ハイライトは暖色 / 夜はデサチュレート)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // 太陽方向がゼロのときだけ夜扱い。夕暮れの連続変化は表現しない
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 投影風シャドウ — リフト逆変換 + しきい値カット (決定版)

> **前提の再確認 (10章)**: `l.skyLight` は生のボクセル値 (n/15) ではなく、エンジンが「リフト曲線」  
> `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を適用した後の値である。
>
> | 場所 | ボクセル生値 | リフト後 (= l.skyLight) | pow (·, 5.0) |  
> |---|---|---|---|  
> | 開けた空 | 1.00 | 1.00 | 1.00 |  
> | 木の下 (半径2) | 0.87 | **0.97** | **0.86** ← ほぼ維持 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **これが「ガンマを上げても影が濃くならない」根本原因** (数値で証明済み)。ただし曲線は単調であるため、代数的に厳密に逆変換可能である:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。生値を復元した後は、**しきい値カット** (`smoothstep`) で二値化すればよい。  
> LightEngine の BFS 横拡散は「隣接 1 ブロック = -1」としているため、しきい値 `th = 1 - r/15` はそのまま  
> 「r ブロック以上の遮蔽を影とする」ダイヤルとなる。ブロックを破壊すれば、影も即座に更新される (LightEngine がリアルタイム再計算)。  
> 制限: 影は「上方向の空」を基準とするため、太陽の移動では回転しない (15章「影の真実」)。

```wgsl
// ★エンジンのリフトを厳密に逆変換して生の voxel skyLight (n/15) を復元
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL に cbrt は無いので pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★影半径ダイヤル: th = 1 - r/15 (0.87→半径2以上が影)
const shSoft = 0.04;   // 縁の柔らかさ (0.02=硬い / 0.08=ソフト)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 生値の復元 (これを飛ばすと永久に影にならない)
    let skyRaw = sh_unlift(l.skyLight);
    // ② しきい値でカット — 日向は1、影は0と確実に分離
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太陽に対する Lambert 計算 (太陽がない空では l.directional にフォールバック)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★投影の正体: 太陽の直接光は「空が見える場所」にしか届かない
    let lit = sunL * sky;
    // 影側: 黒ではなく空色に染まり、さらに最低環境光が加算される
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // トーチ光は影を貫通する (blockLight もリフト後に復元されるため)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // フォグを再適用 (engineColour を破棄した分を補正)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission も忘れずに (フォグ済みで加算)
    #endif
    return out;
}
```

> 調整ガイド: **影の面積は `shTh` だけで決まる** — `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 影の縁の硬さは `shSoft` (0.02=硬い / 0.08=ソフト)。影の芯の暗さは `0.09` (最低環境光) と `0.16` (空の散乱光)  
> の 2 点シフトで決まる。夕方に影を広げたければ  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` を足す (長い夕方の影の近似。  
> `sunDir` は `bloxdSunDirection() / length(bloxdSunDirection())`)。影の青味は `vec3f(0.72, 0.82, 1.05)` の B を上げる。

[← 前の部](02-api.md)・[マニュアルに戻る](README.md)・[次の部 →](04-realism.md)

[← 前の部](03-recipes.md)・[マニュアルに戻る](README.md)・[次の部 →](05-troubleshooting.md)

# 第四部: リアル化ガイド

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 13. エンジン既定ライティングとリアル化の余地

エンジンのデフォルト照明は「乗算のみ」であり、スペキュラ・フレネル・暖色/冷色の分離・半球環境光には対応していない。以下に、再構築可能な範囲を示す。

| 機能 | デフォルト | パックで対応可能? |
|---|---|---|
| 拡散 (Lambert) | 方向光の合計スカラーのみ | ◎ `bloxdSunDirection()` を用いて自前実装 (ラップ光源など) |
| スペキュラ (鏡面反射) | 非対応 | ◎ Blinn-Phong (R9.2) |
| フレネル | 非対応 | ◎ Schlick 近似 (R9.3) |
| 暖色トーチ / 冷色空光の分離 | 無色のまま | ◎ (R9.1) |
| 半球環境光 | 方向性なし | ◎ 上=空色 / 下=地面色 (R9.4) |
| トーンマップ | なし (クランプのみ) | ◎ ACES フィルミック (R9.5) |
| 大気遠近法 | フォグ (色置換) のみ | ◎ 距離に応じた彩度低下 (R9.6) |
| 表面ディテール | テクスチャ解像度に依存 | △ ハッシュノイズによるマイクロバンプ (R9.8) |
| 頂点波 (水面) | なし (平面) | ◎ allow 限定 (R7) |
| 波法線 / 太陽グリント | 非対応 | ◎ (R9.7) |
| 影 (スカイ遮蔽シャドウ) | `mix(環境色, 空色, skyLight)` で緩やかに混合 | ◎ リフト逆変換 + しきい値カット + 太陽ゲート (R9.12)。木陰や屋根下が明確に反応し、ブロック編集にリアルタイム追従 |
| 夜の月光処理 | 空色が暗くなるだけ | △ 月の方向は入力にないため、方向性を持つ月光は不可。青い環境光や彩度低下による擬似表現のみ (R2 夜の青い環境光 / R9.11) |

## 14. リアル化の実装パターン — 2つの流派

**流派 A: 加算修正 (defaultLight 起点)** — `engineColour` (完成色) を素地に、暖色グローや rim を足す。手軽で安全だが照明モデル自体は既定のまま。

**流派 B: 完全リライティング (s.colour 起点)** — `l.engineColour` を放棄し、`s.colour` (アルベド) と LightIn の生データから照明を再計算する。リアル化の本命。以下の4点を遵守すること。

1. **フォグをかけ直す**: light フックは最終段 (フォグの後) なので `mix(l.fogColour, col, l.fogVisibility)` を自分で適用する (R9.10)。霧が濃すぎるときは `max(l.fogVisibility, 0.3)` のように下限を敷く。逆に engineColour 起点のパックで更に霧色を混ぜると二重フォグで白濁する
2. **unlit バリアントのフォールバック**: `#ifdef BLOXD_LIGHTING` の外側では `defaultLight` にそのまま流す
3. **共用関数をガードする**: `BloxdLightIn` を引数に取る共用関数は、関数単位で `#ifdef BLOXD_LIGHTING` で囲む (呼び出し側だけでは不十分)
4. **太陽方向が無いとき**: `bloxdSunDirection()` がゼロなら方向性スペキュラは計算しない。`l.directional` は光量のスカラーで方向ベクトルではないため、ハイライトの方向を復元する用途には使えない。必要なら方向性のない弱い環境光に切り替える。なお月の方向は `-bloxdSunDirection()` で得られる (昼夜サイクルのあるワールドでのみ動く。[第七部](07-internals.md) R-A)

## 15. 到達できない表現 (リアル化の「天井」)

| 表現 | 理由 |
|---|---|
| ピクセル精度のシャドウマップ (太陽とともに回転する影・ペナンブラ) | 深度テクスチャを参照できない (液体専用の `bloxdOpaqueBehind()` は幾何情報のみで、シャドウマップには利用できない)。また、光の視線に対する遮蔽判定はフックに入力されない |
| SSAO | シーンの深度にアクセスできない (AO は頂点カラーにベイクされたもののみ。液体専用の深度は SSAO には利用できない) |
| SSR (反射) | シーンの色を取得できない。フレネル効果により空色を乗せる擬似的な処理のみ可能 |
| ブルーム / グレア | ポストプロセスにフックが存在しない |
| 被写界深度・色収差・グレイン | フルスクリーンの後処理が必要 |
| 体積光 (ゴッドレイ) | 同上 |
| PBR テクスチャ | テクスチャの参照が禁止されている。色の輝度から擬似的に推定するのみ |
| 水中ヴェール (青色のティント) の除去・変更 | ヴェールは「カメラが入っている液体ブロックの定義された color/alpha」から生成されるエミッシブなフルスクリーンクワッドであり、フックのパイプライン外 (最前面) に描画されるため、パックからは色も濃度も変更できない |
| 水中の直接検出 | カメラが水中にあるかどうかを示す入力がなく、水中でも fogStart / fogEnd / fogColour が変化しないため、fogVisibility などから水中を信頼できる形で推定する方法がない |
| 水中屈折 | シーン色は取れない。液体限定の深度 (`bloxdOpaqueBehind()`) で厚み吸収・底面投影は可能 ([第八部](08-apiv2.md) R-E) |

### 影の真実 — 「木の影が落ちる」は作れる

上記の表で実現不可能なのは**太陽とともに回転するピクセル精度のシャドウマップ**だけである。エンジンは当初から「影」を計算しており、それが `skyLight` である。メッシュ生成側の LightEngine は Minecraft 型のアルゴリズムで動作する:

1. **縦列スキャン**: 各 (x,z) 列を上から下へ走査。空からの光は 15 で開始し、**不透明ブロックで 0** となり、`lightFilter` (空気 1 / 水 3 / 不透明 15) で減衰しながら下降する
2. **BFS フラッドフィル (幅優先探索)**: 6 近傍へ横方向に拡散 (1 ブロックで -1) — これが影のエッジをソフトにする要因。半径 r の遮蔽物の下での生値は (15-r)/15 となる
3. blockLight (トーチ等) は RGB 3 チャンネル (4bit パック) の別 BFS

つまり `l.skyLight` は単なる明るさパラメータではなく、**「その位置から空が見えるか」を示すボクセル解像度の遮蔽データ = 影マップ**である。木の下・屋根の下・建物内部はすでに数値が低く、頂点補間により滑らかに伝達される。また、ブロックを設置または破壊すれば LightEngine が即座に再計算する = **リアルタイムに追従する影**である。バニラではこれを `mix(環境色, 空色, skyLight)` で「控えめに」使用するため、影が薄くなる。さらに `l.skyLight` はリフト曲線適用後の値 (10章) であるため、`pow(skyLight, γ)` では γ=5 でも木の下 (0.97) を 0.86 までしか下げられない — **ガンマ方式は数学的に対抗できない**。

正しいアプローチは、R9.12 の 2 段階手法 (**リフト逆変換で生値を復元 → しきい値 `smoothstep` で二値化**) であり、`th = 1 - r/15` が「影とみなす遮蔽半径」の直接的な調整ダイヤルとなる。これに、**太陽光を sky でゲートする** (空が見える場所にのみ太陽が届く = 投影の本質) を加え、日向 = 暖色 / 影 = 冷色で彩色する構成が適切である。

**制限 (正直に)**: この影は「上方向の空」を基準にしているため、**太陽が時間とともに動いても影は回転しない**。解像度はブロック単位 (ソフトエッジは BFS の広がりによるもの)。なお、エンジンの照明テンプレートには `var shadow: f32 = 1.;` というシャドウマップ用の未使用変数が残っており (常に 1.0 = 無効)、ピクセル精度の回転する影は「将来の実装予定」の痕跡と解釈される。ピクセル精度の回転する影がどうしても必要であれば、それは現行の API の範囲外の話である。

### 水中の正体

水中の見た目は 3 層で構成されている。

| 層 | 内容 | パックで扱えるか？ |
|---|---|---|
| ① 地形・液体の描画 | フックで操作可能。light フックは水中でも通常どおり呼び出される | はい (「ヴェールの下」で動作) |
| ② 液体定義色のヴェール | カメラ位置の液体ブロック定義 color/alpha による emissive フルスクリーン quad を最前に描画。ゲーム設定 `cameraTint` があればそちらが優先 | いいえ (色も濃度も変更不可) |
| ③ cameraTint | ゲーム設定 | いいえ |

水中でも fogStart / fogEnd / fogColour は変化しないため、**fogVisibility は水中判定に利用できない**。差異が分かりにくいのはヴェールの影響であり、パック自体は水中でも動作している

## 16. デバッグのコツ

- 洞窟が明るすぎる → `skyLight` の非線形カーブが不足している (R2 洞窟レシピ / R9.9)
- 木の下・屋根の下を `pow(skyLight, γ)` で強調しても暗くならない → `l.skyLight` はリフト後の値 (10章)。R9.12 の逆変換 + しきい値カットに切り替える
- 影の面積・濃さを調整したい → R9.12 の調整ガイドを参照 (面積=しきい値 `shTh` / 縁=`shSoft` / 芯の暗さ=最低環境光と空散乱光の 2 点シフト)
- 昼間が白飛びする → ACES 前の露出を下げる
- 夜が暗すぎる → 最小環境光を確保する。`bloxdSunDirection()` がゼロのときは真の月方向が不明なため、青い環境光などの擬似表現を用いる
- 夜なのに照らされた面だけ明るすぎる → 影の色だけを暗くせず、エンジンの完成色 (`engineColour`) 全体にも夜間減衰をかける。局所光を残す場合は `blockLight` / `heldLight` を使って減衰を弱める ([第六部](06-implementation.md) 19節)
- 遠景が霞みすぎる → 大気減衰の係数を下げる
- 松明の周りがオレンジだらけ → 暖色ブレンドの比率を下げる (素の色つき光を残す)
- ブロックがほとんど真っ白になる → light フック出力の合計が 1.0 を超過している (出力の先にクランプは存在しない)。最後に `clamp(col, vec3f(0.0), vec3f(1.0))` を挿入する
- 加算が無いのに白い → fogVisibility の除算による un-fog 逆算が原因。un-fog を外し、再構築する場合は `s.colour` を起点とし、フォグは最後に一度だけ `mix` で適用
- 発光ブロックが光らない → 再構築系で emission の再加算漏れ。`+ s.emission * l.fogVisibility` を追加する

[← 前の部](03-recipes.md)・[マニュアルに戻る](README.md)・[次の部 →](05-troubleshooting.md)

[← 前の部](04-realism.md)・[マニュアルに戻る](README.md)・[次の部 →](06-implementation.md)

# 第五部: トラブルシューティング・注意

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む (v2 ではフィールド常在のため通常は起きない。判定用途のガードは残す) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` を起点に書き換える |
| `pack.json needs "apiVersion": 3.` | `apiVersion` が無いか `3` でない。数値の `3` を入れる (文字列の `"3"` は不可)。v1/v2 パックは `shaderPack:loadWrongApiVersion` で拒否される |
| `There's no pack.json at the top of the pack.` | ZIP直下に `pack.json` が無い。フォルダごと固めていないか確認する |
| `bloxdTerrainVertex must be declared as: fn ...` | シグネチャ不一致。表示された宣言どおりに書き直す |
| `bloxdTerrainVertex can't run in strict games...` | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` で囲む (v2 ではフィールド常在のため通常は起きない) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` で囲む |
| `pow(l.skyLight, γ)` をいくら上げても影が濃くならない | `skyLight` はエンジンのリフト曲線通過後の値 (生値 0.87 が 0.97 で届く)。R9.12 のリフト逆変換 + しきい値カットに切り替える (10章) |
| `... can only be a function's parameter or return type, ...` | 未初期化の `var x: BloxdSurface;` は不可。`bloxdDefault*` から作る |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform はパックから直接参照不可。`bloxdTime()` 等のヘッダ関数経由で使う |
| `Packs can't declare bloxd_ names...` | 自分の識別子から `bloxd_` 接頭辞を外す。定義できるのは 6 つのフック名だけ |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 等を起点に書き換える。light フック第 1 引数のコピー `var out = s;` から始めるのも可 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` は不可。`_ = f();` と書く |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 地形フック内の `bloxdOpaqueBehind()` 呼び出しを `#ifdef BLOXD_SCENE_DEPTH` で囲む |
| `...only surface and light hooks can use.` | vertex フック内の `bloxdOpaqueBehind()` を消す (surface / light のみ可) |
| `Lite: …reads scene depth on a page that didn't turn it on` | 深度読み取り ([第八部](08-apiv2.md) §35) をするパックが有効な状態でページを再読み込みして開き直す。深度テクスチャの用意はページ生成時に確定する |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | エラーではなく strict ゲームでの自動無効化 (`shaderPack:offInStrict`)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第2段階 (ブラウザ Tint) のエラー。`^` `&` `\|` `<<` `>>` のオペランドは括る (§38) |
| zip 読み込みで `loadDuplicateManifest` | `pack.json` が 2 つある (大文字小文字違いも含む)。1 つにする |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL の `?renderer=` と localStorage の `bloxdRenderer` を外して再読み込みする ([第七部](07-internals.md) §29) |
| 遠景が白く濁る | フォグの二重掛けが原因のことが多い。完成色はフォグ済みなので、独自の霧色は控えめにし、彩度だけを落とす方式を検討するとよい |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | 発光ブロックが密度の高い領域・領域渡りで光のシードキューが溢れ、そのチャンクのライト計算が途中で打ち切られた警告。パック由来ではないが、**発光集中部のライト欠けはこの仕様**が原因であり、ワールド側で光源を分散させれば避けられる |
| ゲーム参加時にパックが除外される | ゲーム開始時の実機チェックで失敗している。ガード漏れを見直す |
| 実機チェックが終わらず `This device couldn't check …` 等でパックが外れる | チェックには 60 秒の強制タイムアウトがある (超過分は `skipped` 扱い)。低スペック端末・重いワールドで出やすいから、負荷の高い vertex 処理や複雑なループ構造を減らして再試行する |

### ローダー段階のエラーID一覧

設定画面のエラーには `shaderPack:load*` のIDが付く。文言検索の補助として:

| ID | 意味 |
|---|---|
| `loadZipTooBig` | zip が 32MB 超 |
| `loadTooManyZipEntries` | zip エントリが 1024 個超 |
| `loadTooManyWgsl` | `.wgsl` が 256 個超 |
| `loadSourceTooBig` | `.wgsl` 合計が 256KB 超 (ファイル単位のストリーミング検査) |
| `loadManifestTooBig` | `pack.json` が 64KB 超 |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` が JSON でない / オブジェクト型でない |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` 無し / `3` でない (v1/v2 は拒否) |
| `loadNoName` / `loadAuthorNotString` | `name` 無し / `author` が文字列以外 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 対応外圧縮方式 / zip64 / 分割 / 暗号化 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | パス重複 / UTF-8 以外 / 展開失敗 / zip 損傷 |

`loadNoManifest` / `loadDuplicateManifest` (pack.json の位置・重複) は上の表の該当行を参照。

## 18. 権利・注意

- シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パック制作は想定内の行為と考えられる。ただし公開公式ドキュメントは確認できていない
- パックは純粋な WGSL であり、JS 実行・ネットワークアクセスは設計上不可能
- 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる

[← 前の部](04-realism.md)・[マニュアルに戻る](README.md)・[次の部 →](06-implementation.md)

[← 前の部](05-troubleshooting.md)・[マニュアルに戻る](README.md)・[次の部 →](07-internals.md)

# 第六部: 実装時の重要な補足

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 19. 夜間に「影は暗いのに表面だけ明るい」を直す

影だけを暗くする処理では、太陽の出ていない時間帯でもエンジンの完成色 (`engineColour`) が明るく残り、面と影の差が不自然になる場合がある。影の色調ではなく、完成色全体に対して減衰を適用する必要がある。

次の例では、`bloxdSunDirection()` がゼロの場合は夜間、方向を持つ場合は昼間とみなし、夜間は地形の完成色を減衰させる。照明対応バリアントでは、`blockLight` と `heldLight` の値が強い箇所ほど減衰を緩和し、松明などの近距離光源の効果をできるだけ保持する。`0.52` は調整用の係数であり、より暗くしたい場合はこの値を小さくする。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 完成色を減衰させ、素材の emission は既定どおりフォグを通して加算する
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**この処理の限界:** `bloxdSunDirection()` の仕様が「太陽あり=単位方向、太陽なし=ゼロ」の二値であるなら、昼と夜の区別はできても、夕焼けや薄明を連続的に推定することはできない。また、完成色を減衰させるため、エンジン側の昼光・環境光をまとめて弱める方式であり、時間帯を完全に再現するものではない。液体にも同じ処理を適用したい場合は、液体フックのフォールバック関係を確認すること。

## 20. 水を自然に見せるための統合レシピ

このAPIではシーン色をサンプリングできないため、**本物の反射・屈折ではなく、フレネル風の色ブレンドと太陽ハイライトによる疑似表現**になる (水深計算は v2 の `bloxdOpaqueBehind()` で可能になり、[第八部](08-apiv2.md) R-E に分離した)。以下は色のベースを残しながら、浅い視線角度で空色に近い色を少し混ぜ、太陽があるときだけ小さなグリントを足すサンプル。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

調整の目安:

- 水が白っぽい / 明るすぎる場合: `fresnel * 0.38` の `0.38` とグリントの `0.55` を下げる。
- 水が濃すぎる場合: `fakeSkyReflection` の混合率を少し上げる。ただし、上げすぎるとプラスチックのような質感になる。
- 水面に線や規則的な縞が見える場合: 波の周波数やグリント強度を下げる。なお、水面メッシュ自体の頂点変位はこのコードには含まれていない。
- 実際の景色を映したい: このAPIの入力には画面色がないため、色を混ぜるだけでは実反射にならない (深度は液体限定で取得可。[第八部](08-apiv2.md) R-E)。

このレシピは既存の `bloxdLiquidLight` を**置き換える**ものである。R9.7 の同名波法線関数や他の同名フックと重複して適用しないこと。

## 21. 実機テストのチェックリスト

コンパイルの成功と「見た目の良さ」は別であるため、以下の順で確認する。

1. **読み込み:** `pack.json` が ZIP 直下にあること。選択直後は `Ready. Reload the page to use it.` と表示され、**ページ再読み込みで有効化**される。再読み込み後に `Ready to use` になることを確認する。なお一度保存したパックは、エンジン側の仕様ヘッダが更新されるとヘッダ内容の指紋照合により次回ページ読み込み時に自動で再検証される (合格ならそのまま有効 / 不合格なら blocked 表示)。古いパックが壊れたまま黙って有効であり続けることはない。
2. **8バリアント:** strict / allow、照明 on / off、terrain / liquid の各条件において、型ガードの漏れがないことを確認する。ゲームが一部の条件しか使用しない場合でも、配布用パックは8通りすべてを想定する必要がある。
3. **日中:** 草・石・砂・木材など素材ごとに色が不自然に飛んでいないか、上面と側面の明暗差が不自然でないかを確認する。
4. **夜間:** 日向だった場所と同じ素材、影、松明の近くを比較する。明るい面だけが残る場合は露出減衰、全体が暗くなる場合は局所光保護を調整する。
5. **水:** 真上・浅い視線角度・岸辺・水中・夜を別々に見る。アルファの挙動と水中の見え方はゲーム側の合成方法に依存するため、ひとつの視点だけで判断しない。水中は[第七部](07-internals.md)のとおり液体定義色のヴェールが最前面に掛かるため、パック有無の差は主に水面とヴェール越しの地形で確認する。
6. **境界と距離:** チャンク / 原点の切り替わり時に波や模様が途切れないか、遠景で二重フォグや白い霞が発生しないかを確認する。
7. **性能:** ハッシュ・三角関数・`pow` を多用する効果は必要最小限に抑える。ディテールを少しずつ追加し、FPSを比較する。

### 既知の制約を前提にする

- shader pack は terrain / liquid のフックに限定されており、空・エンティティ・UIを同じコードで処理する仕組みではない。
- 影マップ、画面空間反射、屈折、ブルームなどを追加するための入力はこのAPIにない (シーン深度は液体限定で `bloxdOpaqueBehind()` として解禁。[第八部](08-apiv2.md)参照)。
- `bloxdTime()` はアニメーション用の時間であり、ゲーム内の昼夜と連動する保証はない。
- `bloxdSunDirection()` がゼロなら真の月方向ではなく、青い環境光を加える処理は雰囲気を作る近似。方向性のある月光は `-bloxdSunDirection()` で作れる (昼夜サイクルワールド限定。[第七部](07-internals.md) R-A)。
- `s.position` / `l.position` はローカル座標であるため、ワールド位置に依存する効果では `bloxdOriginOffset()` を加える。ブロック内ローカルの模様を作成する場合は、意図的にローカル座標を使用することもある。

## 22. シェーダー単独で限界がある場合の組み合わせ

シェーダーパック側でテクスチャを追加・サンプリングできない制約があるため、素材そのものの細かな凹凸や空の画像を変えたい場合は、シェーダーだけで解決しようとしない。Bloxd.io向けの公開テクスチャーパックリポジトリ [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) には、テクスチャ、skybox、モデル等を扱う別方式の例がある。これはシェーダーパックAPIの公式仕様書ではなく、別システムのリソース例として参照する。

参考までに、コミュニティで「cinematic shader」として出回っている配布物を解析した事例では、中身はテクスチャパック (128x128 テクスチャで `pack.json` / `.wgsl` を含まない) だった。「影付きシェーダー風」の見た目の多くはテクスチャ側の工夫であり、シェーダーパックで光と影を作り分ける (R9.12) 方針と、テクスチャ側の補完を組み合わせるのが現実的である。

現実的には、**シェーダーで光と色を調整し、対応する別のリソースパックで素材や空を補う**方針が望ましい。ただし、別パックとの同時利用の可否や読み込み順については、ゲーム側の実装や設定で確認する必要がある。

テクスチャパック側にも仕様がある (参考): サイズ上限は base64 変換後の JSON 文字列長で 25MB であり、PNG の base64 化は +33% 膨張するため、生画像の合計は ~18-19MB が実質上限になる。CSS は正規表現による簡易解析で処理されるため、ネストやコメントは書かないこと。

## 23. 水中とシェーダーパックの実情

水中の見た目は次の 3 層で構成される。

| 層 | 内容 | パックで操作可? |
|---|---|---|
| ① 地形・液体の描画 | フックで加工できる。light フックは水中でも通常どおり呼び出される | 可 (ヴェールの下で有効) |
| ② 液体定義色のヴェール | カメラ位置の液体ブロック定義 color/alpha の emissive フルスクリーン quad (最前面)。ゲーム設定 `cameraTint` があればそちらが優先される | 不可 (色も濃さも変更不可) |
| ③ cameraTint | ゲーム設定によるもの | 不可 |

実用上の要点: 水中でもパックは動作している / ヴェールは無効化できない / 水中かどうかを条件分岐できない (fogStart / fogEnd / fogColour は水中で変化せず、fogVisibility から推定する方法もない)。

[← 前の部](05-troubleshooting.md)・[マニュアルに戻る](README.md)・[次の部 →](07-internals.md)

[← 前の部](06-implementation.md)・[マニュアルに戻る](README.md)・[次の部 →](08-apiv2.md)

# 第七部: 内部仕様の補足

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

エンジンの実装を解析して明らかになった追加仕様である。これらはすべて、現行の本番ビルドにおける JavaScript から直接復元したものである。

## 24. 太陽と月の正体

`bloxdSunDirection()` の供給元は、スカイボックスの種類が変更されたときにのみ更新される太陽方向バッファであり、判定基準は「空に太陽が存在するか」ではなく**「スカイボックスが earth 型かどうか」**である。

| スカイボックス | `bloxdSunDirection()` |
|---|---|
| `default` (プロシージャルスカイ) | 非ゼロ (後述の既定値) |
| `gloomy` / `interstellar` / `space_*` (キューブテクスチャ) | **常に (0,0,0)** |

**月は常に `-bloxdSunDirection()` の位置にある** (エンジンが月の位置を太陽の真逆に計算するため)。夜の判定は太陽高度によって行われる — `bloxdSunDirection().y < 0` (太陽が地平線より下) の場合、月が上に存在する。ただし、既定ワールドでは太陽が静止しているため月も静止しており、動くのは昼夜サイクルを実装したワールドのみである。

既定ワールドにおける太陽方向は約 `(-0.56, 0.81, -0.18)` (傾斜角 = −0.2 / 方位角 = 0.55 から算出される単位ベクトル、静止) であり、配布パックのテスト時にハイライトの向きを机上で予測するための基準値となる。

昼夜サイクルはエンジンに組み込まれていない — 傾斜角は静的な数値であり、昼夜が動くワールドはゲーム側が更新を行っている。その更新のたびに `bloxdSunDirection()` も更新されるため、それに追従する形となる。

地形の方向光はシーン起動時に作られる 2 灯のみで**方向も強度も固定、昼夜で変化しない**。まとめると**地形の明るさを決める要素はどれも時間に依存しない。昼夜の「見た目」はスカイボックスと bloxdSunDirection() のみ**であり、夜に地形を暗くしたいパックは bloxdSunDirection() から自分で時間帯を推定する (§19 の `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −bloxdSunDirection()

月が上にある時間に限り、青白いランバート反射と弱めのスペキュラが加算される。`moonUp` が 0 の世界 (既定の静止太陽ワールド) では何も発生しないため、**昼夜サイクルのあるワールドでのみ有効となる安全な月光**となる。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 月はつねに太陽の正反対に位置する。昼間は moonDir.y < 0 となり、自動的に消灯する。
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. フォグの内部仕様

フォグ計算は常に LINEAR モード (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`、0〜1でクランプ) で行われ、`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)` (D = フォグ距離設定。D = 0 の場合のみ fogEnd = 5 の例外) となる。**フォグの減衰域はわずか 32 ブロック幅**であり、`l.fogVisibility` は「距離に応じた霧の濃さ」というより、**「読み込まれたワールド境界までの正規化距離」**を示す指標である。プレイヤーごとに読み込み距離が異なるため、距離に基づく演出を実装する場合は、各自で `distance(l.position, bloxdEyePosition())` を計算する必要がある (レシピ R-B)。(v3 注記: レンダラのフォグ関数は実際には **off / exponential / exponential-squared / linear の4モード**を実装しており、出荷タイトルは linear を駆動している。復元したソースと堅牢性の議論は[第九部](09-apiv3.md) §50。)

既定のフォグ色は `rgb(183, 191, 195)` (淡い青灰色)。ワールド作成者は `fogColourOverride` (hex) で変更できる。フォグモードが 0 (NONE) の状態では **fogColour は黒で届く** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`)。`mix(l.fogColour, col, l.fogVisibility)` の標準形なら fogVisibility が 1 のとき霧色が使われないため安全。スクリプト API 側には他に `fogChunkDistanceOverride` と `fogOnSkybox` のオプションがあり、カスタムゲームはフォグ距離 (D に相当する値) とスカイボックスへのフォグ適用を個別に設定できる。既定ではスカイボックスはフォグの影響を受けない (`fogOnSkybox` を有効にしたゲームでのみ、スカイボックスもフォグ色で染まる)。

プレイヤー側の `showFog` を false に設定すると、フォグは 3200〜3232 ブロックの範囲に追いやられ、実質的に無効化される (fogVisibility ≈ 1 が継続される)。

### R-B. 読み込み境界バンド — fogVisibility を「ワールドの縁」として使う

読み込み境界付近の 32 ブロック帯を、静かな冷色で処理することで、ワールドの端を目立たなくしている。距離を個別に計算しないことにより、プレイヤーの読み込み距離設定に自動で追従するのが利点である。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内側 (境界まで余裕あり)、0 = 境界の外へ出る直前
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight の内部構造

`blockLight` は RGB 3 チャンネルの**色付き光**である。光源ブロックごとに発光色 `[R, G, B]` (各 0-15) が定義されており、それがそのまま光の色になる (通常トーチ = 暖白 (14,14,12) / ラバ = オレンジ (14,8,2) / ビーコン = シアン (5,14,14) / 白トーチ = (15,15,15) など)。頂点段では 1 つの float 属性に r / g / b / sky の 4 ニブルでパックされて届く。ライトフック内では 3 チャンネルを別々に扱うことで色付きの局所照明が作れる — 暖色トーチ系レシピ (R9.1) が基準とする挙動の実体はこれである。

`aPackedLightLevels` のデコード時に、エンジンは各チャンネルに **RGB の最も明るいチャンネルの 35% を下限にする「35% チャンネル床」**を敷く。例えば「真っ赤な光源」は (1.00, 0.35, 0) に持ち上げられてから補間・リフトを通る。松明の橙が「赤というより白っぽいピンク」に見えるのはこのためであり、暖色トーチ系レシピ (R9.1) の彩度はこの既定挙動を基準に調整すると良い。

照明の合成は加算ではない。エンジン内部では、35% 床を敷いたブロック光と `mix(アンビエント色, スカイ色, skyLight)` で作った空光の **max** を取り、手持ち光 (アンビエントブースト適用後) をさらに max で上乗せする。この合成に使われるチャンネル値は**リフト後**の値である — エンジンは v2 でも v3 でも、フック入力に届くのと同じリフト済みのライトレベル (リフトカーブ適用後の `terrainLightLevels`) から合成する。したがって `blockLight` と `skyLight` は互いに打ち消し合わず、暗い側の寄与は捨てられる — 空光を弱めてもブロック光が支配的な箇所はほとんど暗くならない。露出や減衰のレシピはこの構造を踏まえて設計する ([第六部](06-implementation.md) §19 の局所光保護はこの構造への補償である)。

手持ち光 (`heldLight`) は範囲が光色の最も明るいチャンネル値 (最大 15 ブロック) で決まり、距離に `dist^0.75` の前処理が入る。blockLight と同じ 35% チャンネル床が適用され、`l.heldLight` はアンビエントブースト**前**の値である。円錐の減衰はエンジンのライトモジュールから復元したとおり: ビームの角度減衰は `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` (`t` は円錐軸からの正規化角度、0 = 中心、1 = 縁)。到達距離は `(rangeOverride > 0 ? rangeOverride : 最も明るいチャンネル) × 円錐減衰` で、`rangeOverride` は手持ち光色の alpha から読む。到達距離の内側では、override は `(range − dist) / range` で減衰し、既定は (前処理済みの) 距離をチャンネルごとに引く。その後 35% 床、15 での除算、リフトカーブを経て、最後にアンビエントブーストがかかる。カスタムアイテムには `spotlightRange` (射程) と円錐角を設定でき、円錐光の位置はカメラに追従する。パック側からビーム方向を知る手段は無い。

`skyLightEmission` (0〜15) を持つカスタムブロックは、**blockLight の BFS とは別に skyLight チャンネルそのものを注入できる**。R9.12 のような「skyLight のしきい値で日向/影を判別する」パックは、人工光源で skyLight が持ち上げられているワールドでは誤判定になりうる。配布パックでは blockLight との組み合わせで判定する方が頑健である。

## 27. パイプライン細部

- **surface フックは alphaTest の「手前」で動く**: `out.alpha` がそのまま discard 判定に使われる。カットアウトマテリアル (草・葉など) ではディザパターンで溶けるようなエフェクトが作れる (レシピ R-C)。液体 (ブレンド描画) では `out.alpha` が実際の透明度になる (レシピ R-D)。通常の不透明地形では alpha は最終的に無視される
- **`l.ambient` の中身**は `material.ambient × sceneAmbient` でマテリアルごとに異なる値である。シーン側はグラフィック設定「Ambient Lighting Intensity」(既定 0.5) に直結しているため、既定値の決め打ちをしないこと
- **シーンの方位光は 2 灯構成**: 主光 (方向はスカイ設定の太陽位置に由来・強度 1.0) とフィル光 (方向 `[-0.5, -1, -1]`・強度 0.35) の Lambert 和が `l.directional` に届く。フィル光は方向が下向きのため天面には寄与せず、下向きの面 (洞窟の天井など) を拾う。地形が考慮するのは `_initScene` で追加された灯のみで、起動後にシーンへ追加した灯は地形・ブロックモデルから無視される (公式の警告文言がある)
- **`bloxdTime()` の正体は `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` であり、ブラウザの起動経過時間を 1 時間で折り返した値である。ゲーム内昼夜ともワールドの経過時間とも無関係。ゲーム内時計と同期したアニメーションを作りたい場合は、昼夜サイクル実装ワールドの `bloxdSunDirection()` 方位角から推定するのが現実的である
- **ヘッダ関数の実体は 1 本の uniform**: エンジンは `@group(3) @binding(0)` に 64 バイトの uniform (time / originOffset / sunDirection / eyePosition の 4 スロット・little-endian) を置いており、`bloxdTime()`・`bloxdOriginOffset()`・`bloxdSunDirection()`・`bloxdEyePosition()` は各スロットの読み出しに相当する。`originOffset` は現行ビルドでは常に `[0, 0, 0]` (浮動小数点ワールド座標用の予約スロット) である。パックからこの uniform を書き換えることはできず、パックとエンジンの WGSL は同一モジュールに合成されるため、同じ group/binding を自分で宣言することもできない。(v3 では2つのスロット名が変わり — `seconds` / `renderOffset` となり、`bloxdSeconds()` / `bloxdRenderOffset()` として公開される — さらに `@group(3) @binding(1)` に scene-depth テクスチャが加わる。[第九部](09-apiv3.md) §41 と §51 を参照)
- **頂点データはメッシャー (Web Worker) が作る**: ブロックの地形を 1 頂点 28 バイト (アトラスありは 32 バイト) のインターリーブで整え、位置 = float32×3 / 法線 = 8bit 信号整数×4 / 色 = 8bit 準整数×4 (`s.colour` の実体 — tint × AO がメッシャーの時点で 8bit に焼き込まれ、パックから分離・復元は原理的に不可) / UV = float32×2 / atlasIndex = float32。ライトレベルだけは独立した 4 バイト頂点バッファで運ばれる ([第七部](07-internals.md) §26・[第二部](02-api.md) §11)。頂点はチャンク単位の instancing で描かれる
- チャンク読み込み時の「細かい市松模様」はエンジンの画面空間 Bayer 4×4 ディザによるチャンクフェードであり、パック由来のバグではない (グラフィック設定の `chunkFadeIn` をオフにすると無効化できる)
- **`mod` は予約語**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` で拒否される。剰余は `%` 演算子で書く

### R-C. Bayer ディザ溶解 — out.alpha が discard を制御する

エンジンがチャンクフェードに使っているのと**同じ Bayer 4×4 テーブル**を再現し、低いブロックから順にディザで「溶ける」cutout を作る。alphaTest マテリアル (草・葉など) では discard が走り、液体ではブレンドの透明度になる。

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod は予約語のため、% 演算子を使用する
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // y の値が小さいブロックから順に溶解する。dissolve の値が高いほど残りやすい
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水のカメラ近接フェード — 液体の alpha で見通しを確保

液体フックの `out.alpha` はブレンドに直接関係する。カメラ直下の水面だけを透過させ、潜水・水上カメラの視界を確保するための手法。

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0〜3 ブロックで完全透明→通常
    #endif
    return out;
}
```

## 28. パックに見える値を変えるもの — テストチェックリスト

同一のパックでも、**ワールドとプレイヤー設定により `l.*` の内容が変化する**。配布前に、少なくとも以下の 3 つの環境で見た目を確認すること。

1. **通常ワールド** (default スカイボックス・オーバーライド無し) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`・既定色
2. **space 系スカイボックスのワールド** — bloxdSunDirection() = 0。`sunPresent` 分岐の見た目
3. **`visionMinLightColour`・`skyLightColourOverride` を設定したカスタムワールド** — 暗部と色が持ち上がるケース

主な変動源: `lightingOverride` (照明強制) / `skyLightColourOverride`・`ambientLightColourOverride` (hex 差し替え) / `visionMinLightColour` (視認最暗色。実装は `uSkyLightColour` と `uAmbientLightColour` 双方への成分毎 max であり、Night Vision が使用。「洞窟を真っ暗に」系は想定より暗くならず、空の色自体も底上げされる) / `heldLightColourOverride`・`Range`・`ConeAngle` / `fogChunkDistanceOverride`・`fogColourOverride`・`fogOnSkybox` / `skyBox` (bloxdSunDirection() の有無)。`uSkyLightColour` 既定 = (1,1,1) 白、`uAmbientLightColour` 既定 = (0.25,0.25,0.30)。`l.ambient` のシーン成分 = グラフィック設定「Ambient Lighting Intensity」(既定 0.5)。`l.fogVisibility` はプレイヤーのフォグ/チャンク距離設定に追従。ほかに `cameraTint` (画面全体への RGBA ティント) と `proximityFadeDistance`・`proximityFadeMinOpacity` (エンティティのカメラ近接フェード) もワールド設定由来の変動要因で、特に `cameraTint` はパック出力の上に乗る最終処理である。これらの多くはスクリプト API (`serverOption`) 経由でも設定でき、ゲーム実行中にも更新され得る。

## 29. デバッグ手段

- URL パラメータ `?renderer=lite` — Lite (WebGPU) レンダラーを強制 (`webgl2` / `babylon` も可。`babylon` は webgl2 の旧名エイリアス)。優先順位は URL パラメータ > localStorage の `bloxdRenderer` > 設定画面 > 既定 (webgl2)。無効値は警告と共に無視される。URL や localStorage にオーバーライドが残っていると、WebGPU (lite) が必要な場面で失敗し「needs the new WebGPU renderer, so remove the renderer override...」が出ることがある ([第五部](05-troubleshooting.md) §17)
- URL パラメータ `?vconsole` — 画面内コンソール (VConsole) を起動。モバイル実機検証で重宝する
- URL パラメータ `?drawcalls=1` — 描画統計のデバッグパネルが追加される。デバッグ用コンソールからゲームオブジェクトを選ぶか、`drawCalls()`・`why()`・`configureDrawCallWatching()` を使って、パックに限らず大規模ギミックの重複描画 (オーバードロー) や 1 図面あたり約 6.5 万頂点の上限への到達を確認し、性能不足の原因を切り分けられる
- コンソールには `noa-engine v0.33.0` と `Renderer: lite from <ソース>` が表示される — 描画パスの誤診断防止のため、まずこれを確認する
- WebGPU レンダラーはパック適用中「強制 ON」でロックされる。「Disable Block Texture Atlas」設定もロックされ (アトラス ON を維持)、WebGPU 非対応環境ではそもそもパックが適用できない。配布ページに「WebGPU 対応ブラウザが必要」と記載する根拠はここにある
- ブロックテクスチャの実体は 2D 配列テクスチャ (`texture_2d_array`) で、地形のサンプラは nearest かつ repeat に設定されている。さらにメッシャーは材質・AO・ライトが一致する面を 1 つの矩形にまとめる (**greedy meshing**) ため、頂点の UV はマージ面上ではタイル幅を超えうる (縁に 0.0015 のインセット)。繰り返し側はハードの repeat アドレッシングが担うので、マージ面はシームなしに見える。ただし `vUV` を基準に手続き的ディテールを重ねると、マージ面の境界で不連続になり得るため、ワールド位置 (`s.position` + `bloxdOriginOffset()`) を基準に設計するのが安全である
- ゲーム参加ごとにランタイム再検証 (`checkCompilation`) が実行され、実在する全地形マテリアルで実際にコンパイルする (設定画面の静的検証より厳しい)。ここで失敗すると、パックはそのゲームで除外される

## 30. ゲーム別の適用モード (`shaderPackPolicy`)

§7 の「allow / strict」がタイトル単位の設定であることがここで確定する。ゲーム定義側の `shaderPackPolicy` が明示的に `"allow"` のタイトルに限り full モード (vertex フック・`discard`・地形 `alpha`) で動作し、指定がない (または allow 以外の) タイトルは strict となる — `BLOXD_STRICT` が定義され、ガード内コードは自動的に無効化される。この判定はパック側からは選択できないため、どのタイトルで何が動作するかを把握しておくことが配布の前提となる。

- 根拠ビルド: `szby6g.main.94a7596c.js` (2026-10-17 時点の本番デプロイ)。全 111 ゲーム定義を静的解析した結果、**allow 26 エントリ (12 タイトル) / strict 85 エントリ**。同じ 12 の allow リテラルが同じ 12 タイトルで v3 本番バンドル (`3ymzdd`、2026-10-20) でも不変であることを再確認した — 以下のリストはそのまま v3 にも引き継がれる。
- `shaderPackPolicy` より上位の判定として配信チャネル側のゲート (`canUseShaderPacks` 相当) もあり、外部ポータル経由の配信 (Coolmath Games 版など) では `shaderPackPolicy` の判定に至る前段でシェーダーパック機構自体が無効化され得る。以下の allow / strict の判別は bloxd.io 本家 Web 版での解析に基づく。
- allow は基底定義の直書き 8 箇所と基底変数 (`tb` / `kz` / `cb` / `Fb`) の 4 箇所の計 12 箇所で宣言され、バリエーションはスプレッド継承 (`{...tb,...}`) で受け継ぐ。バリエーション単位での個別上書き (親が allow・子が strict の逆パターン) は現状存在しない。

allow の 12 タイトル (計 26 エントリ):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (計 11 エントリ)
- **Doodle Cube** — 本体 + Solos / Duos (計 3)
- **Rocket Obby** — 本体 + Sheep / January (計 3)
- **単独タイトル (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 側で特に誤解しやすい点は以下の通りである。

- **Superflat Creative (classic_creativeFlat) は strict**。「Creative」を名に含むが、classic 家族で allow なのは通常の Creative (`classic_creative`) のみ。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等も全件 strict
- **Custom Games (customGames) は strict**。自作カスタムゲームでは vertex フック系の効果は発動しない。作業用の検証は Test Gym で行うのが確実
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系の主要 PvP・サーバー系タイトルはすべて strict

なお strict タイトルでもパックの読み込みとコンパイル自体は行われ、surface / light 等のフラグメント側レシピは通常通り動作する。制約を受けるのは vertex フック (`bloxdTerrainVertex` / `bloxdLiquidVertex`) と `discard`、および地形の `alpha` (液体は常に存在) である。

この一覧は上記ビルド時点の静的解析結果であり、エンジンの更新により allow/strict の配分は変更され得る。新版が公開された際は再確認されたい。

[← 前の部](06-implementation.md)・[マニュアルに戻る](README.md)・[次の部 →](08-apiv2.md)

[← 前の部](07-internals.md)・[マニュアルに戻る](README.md)

# 第八部: API Version 2 移行ガイド

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

対象ビルド: `6qxffk.main.5912a15f.js` (2026-10-16 時点の本番デプロイ)。本書の第一部〜第七部は v2 基準に書き換え済みであり、この第八部は v1 からの移行点と v2 の新機能をまとめたものである。新機能のコード例は v2 コンパイラによる 8/8 バリアント検証とブラウザ WGSL コンパイラ (Tint) 検証 (§38) を通過したもので、既存レシピの v2 変換は機械的な識別子置換であるため、配布前には必ず実機コンパイルで確認すること。

## 31. v1 パックの運命 (先に結論)

ゲームは manifest の `apiVersion` が **2 と厳密一致すること**を要求する。v1 パックをロードすると `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n キー `shaderPack:loadWrongApiVersion`) で拒否される。v1/v2 の**並行サポートは存在しない**。また、エンジンは保存済みパックの `validation.headerVersion` (ヘッダ全文のハッシュ) を再検査するため、エンジン更新時に保存パックが自動的に「要再チェック」になる仕組みは v1 と同じである。

## 32. 識別子の全面改名 (対応表)

v2 ではアンダースコア命名からキャメルケースへ統一された。**旧名は一切使えない**。

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (内部 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`、64B) |

フックの種類 (vertex / surface / light × terrain / liquid の6種) と `pack.json` の形式 (`apiVersion` / `name` / `author`) に変更はない。ローダー制限も変わらない (zip 32MB / エントリ 1024 / `.wgsl` 256 個 / 合計 256KB / manifest 64KB)。

## 33. 削除フィールドの移植先

v1 では `time` / `eyePosition` / `sunDirection` / `originOffset` は構造体のフィールドだった。v2 では**これらのフィールドは削除され、代わりにエンジン uniform (`bloxdPackInputs`) を読み取るヘッダ関数**を使用する。この関数は uniform を直接参照するため、**フック外のモジュールスコープ関数や vertex フックからでも呼び出し可能**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` によるワールド座標化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 新機能 ①: `blockId` (ブロック固有シェーディング)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` の3構造体すべてに `blockId: u32` が追加された。**面が属するブロックの ID** (0〜65535) で、同一面内で一定 (`@interpolate(flat)` で渡される)。テクスチャの色に依存しないブロック種別の識別に利用できる。ただし ID とブロック種の対応表はエンジン内部にありパックからは参照できないため、**どの ID が何のブロックに対応するかは、ワールド内で実測するか、後述の参考データを用いて調査する必要がある**。内部ではこの ID は頂点色の α (下位 8bit) と法線の w (上位 8bit) の合計 16bit に焼かれて運ばれ、上限 65535 はこの経路幅に由来する。blockId システム自体はアクティブなシェーダーパックが存在するときにのみ有効化される (パック無しではワイヤの宛先はパディングのままだが、第二部の構造体定義上この差は観測できない)。

**参考**: 作者がゲーム内エントリ一覧を [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) で公開している (`entries.json`: id ↔ ブロック名の対応表。`Furnace|meta|rot2` のような回転・meta の変種 ID も収録)。ゲームの更新で対応は変わる可能性があるため、最終的な確認は実機で行うこと。

よく使うブロックの例 (entries.json より、2026-10-18 時点。id の低い地形系のみ抜粋):

| ID | ブロック名 | ID | ブロック名 |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json には道具などの非ブロック項目も収録されているが、地形・液体のフックに届くのはブロック系の id である。

### R-F. blockId によるブロック種別ティント

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例: 石系 (id の上位ビットパターン) を寒色寄りにする
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. blockId の実測 — bit 平面表示パック

対応表に載っていないブロックの id をワールド内で調べるデバッグレシピ。先頭の `plane` を `0, 1, 2, …` と変えながら、調べたいブロックの面の色を読む。

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

面の色は blockId の 3 ビットをそのまま RGB で表す (黒 = 0 / 赤 = 1 / 緑 = 2 / 黄 = 3 / 青 = 4 / マゼンタ = 5 / シアン = 6 / 白 = 7)。1 回の観察で 8 進数 1 桁が読める。p0 → p3 の順に 3, 2, 7, 2 と読めた場合は、上の桁から並べた 8 進 2723 = 1491 が id となる (Lava)。id の低い地形系は p0 と p1 の 2 回で足りる。surface フックのみで構成されているため、strict タイトルでも動作する。

### R-H. 葉だけをそよがせる — blockId による vertex フックの絞り込み

R7 の風レシピ ([第三部](03-recipes.md)) は地形全体を波打たせるが、vertex フックでも `blockId` が読めるため、対象を葉ブロックだけに限定できる。id 一覧と WGSL 用の配列は以下の通り (2026-10-18 時点の実測。Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 果実変種 / Autumn Aspen の 22 種):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex フックは strict タイトルで自動無効 (§36 参照)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // 変位はワールド位置の滑らかな関数にする。ワールド上の同一地点を指す
        // 共有頂点が同じ値に動くため、面が剥がれない ([第三部](03-recipes.md) R7 も同じ原則)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id 一覧はエンジンの更新で増える (実測でも新ビルドで 50 種のブロックが追加された)。使い続ける場合は [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) か R-G のビット平面表示で追加分を調べて配列に足すこと
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) は地面に敷く非固体の敷き葉である。揺らすと地面から浮いて見えるため、配列から外して除外するのも一つの選択
- strict タイトルでは vertex フックが丸ごと無効になるが、上のガードがあれば「揺れが止まるだけ」で、フラグメント側の効果は生き続ける

## 35. 新機能 ②: `BLOXD_SCENE_DEPTH` と `bloxdOpaqueBehind()` (本命)

v1 では構造上不可能とされていた深度アクセスが、**液体 (liquid) プログラムに限り**解禁された。色は取得できないが、**奥の不透明面までの距離と位置という幾何情報が取得できる**。典型的な用途は、水の厚みを測定して吸収色を計算することである。

使用ルール:

| 使い方 | 結果 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 内でガードなしで呼び出す | OK (液体バリアントでは常に定義されている) |
| `bloxdTerrainSurface` 内でガードなしで呼び出す | ERROR。`#ifdef BLOXD_SCENE_DEPTH` で囲む必要がある |
| vertex フック内で呼び出す | ERROR (surface / light フックでのみ使用可能) |

地形フックでも深度を使用したい場合は `#ifdef BLOXD_SCENE_DEPTH` で囲む (地形フックは液体プログラムにも流用されるため、液体側でのみ深度が有効になる)。

### R-E. 水の厚み吸収 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水の柱の長さ = 現在位置から奥の不透明面まで
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸収: 赤は速く減衰し、青は遠くまで届く
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 奥が空 = 深い水色へ寄せる
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

応用: 厚みベースの吸収・散乱、`behind.position` からの底面ワールド座標による波紋・コースティック風模様の投影、`found=false` での空と遮蔽の区別による水面の空反射、深度による泡や濁りの段階付与。なお深度コピーのパイプライン構築に失敗した場合は「奥に何も無い」扱いへ安全に劣化する。深度テクスチャはページのレンダラー生成時に「アクティブなパックが深度を読むか」で用意が確定するため、**深度を読むパックを使うときは必ずページ再読み込みを挟む**こと。パックを有効にしたまま再読み込みせずに深度が要求された場合、コンソールに `…reads scene depth on a page that didn't turn it on` と一度だけ警告が出て、深度は 1×1 の代替テクスチャに置き換わるため `bloxdOpaqueBehind()` は常に `found = false` を返す。

## 36. その他の v2 変更点

- **フックのフォールバック**: 液体プログラムは `bloxdLiquidXxx` が未定義の場合、地形フックにフォールバックする。**地形フックのみのパックは水面にもそのまま適用される**。意図しない場合は、liquid 側のフックを明示的に定義すること。
- **`BLOXD_LIGHTING` のフィールドガードは不要に**: すべてのバリアントで `blockLight` 等が存在し、unlit では既定値 (0 / 1 / 白 / 0) が設定される。ライト判定を行う場合にのみ `#ifdef BLOXD_LIGHTING` を使用すること。既存のガードを残しても動作に影響はない。
- **`BLOXD_ALPHA` の定義条件が変化**: 非 strict の地形バリアントおよびすべての液体バリアントで定義され、strict × terrain では定義されない。地形フックで alpha を記述する場合は、ガードを残すこと。
- **構造体の直接構築は禁止**: `BloxdLight(...)` などのコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` を変更するか、入力のコピーを使用すること。
- **`let _ =` は `_ =` に**: WGSL の破棄代入 `_ = f();` は有効であるが、`let _ = f();` は拒否される。
- **offInStrict**: vertex フックの定義、または surface / light フックから到達可能な `discard` が存在する場合、エラーではなく、パック全体が strict ゲームで自動的に無効化される (設定 UI に `shaderPack:offInStrict` と表示され、allow ゲームでは動作する)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲むこと。なお公式の設定 UI メッセージ自体が「strict で動かす残りは `#ifndef BLOXD_STRICT` で囲め」と案内しており、この作法は慣習ではなく公式推奨である。
- **フォグの拡張**: フォグ計算に LINEAR / EXP / EXP2 の3モードが実装されたが、ゲーム側の設定は従来通り常に LINEAR であるため、既存のフォグ仕様はそのまま使用可能。`fogColour` の意味も公式に明文化された (完全にフォグのないシーンでのみ黒となる)。
- **変わっていないもの**: リフト曲線・35% チャンネル床・heldLight 減衰 (`pow(lightDist, 0.75)`) と環境光ブースト・太陽と月の方向仕様・既定フォグ色・time ラップ (3600 秒)・方向光 (最大 4 個)・Lite (WebGPU) 専用・保存機構 (IndexedDB)・`mod` 予約語。

## 37. v1 → v2 移行チェックリスト

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **識別子**: §32 の対応表に従ってすべて置換 (フック名・構造体名・default 関数名)
3. **削除フィールドの移植**: §33 の表に従い、ヘッダ関数へ移行 (`s.time` → `bloxdTime()` など)
4. **`fogFactor` → `fogVisibility`** に改名
5. **構造体直接構築を除去**
6. **`let _ =` を `_ =` に**修正
7. **vertex フックと discard は `#ifndef BLOXD_STRICT` で囲む**
8. **水面も地形フックの効果を受ける**ことを確認し、意図しない場合は liquid フックを明示的に定義すること
9. (任意) `litColour` を起点にフォグを自前管理 / `bloxdOpaqueBehind()` で水の厚み吸収を追加 / `blockId` でブロック固有表現
10. **第2段階 (ブラウザ Tint) も検証する** — 特に `^` `&` `|` `<<` `>>` を含む式の括弧。静的検証を通ってもブラウザで拒否されるコードが存在する (§38)

## 38. 第2検証段階 — ブラウザの WGSL コンパイラは内蔵パーサより厳しい

ゲームのパック検証は **2 段階**ある。第1段階は静的検証 (エンジン内蔵 JS パーサ。フック署名・禁止構文・sceneDepth 利用などパック固有ルールを検査) で、第2段階はブラウザ検証 (コンパイル結果に同梱されるスタブを本物の WebGPU 実装でコンパイルし、エラーをパックの元ファイル行へ逆マッピングして表示する。UI の「Saved, but it won't run until you fix these errors」がこの段階) である。エラー表示末尾の `(only in terrain)` 等の接尾辞は「そのエラーが出たバリアントの program 種」である。

内蔵パーサは WGSL の演算子結合 (Binding) 規則を実装しておらず、**静的検証を通過してもブラウザで拒否される**。被害が出やすいのは整数ハッシュの定番パターンである:

| 演算子 | 帰結 |
|---|---|
| `<<` `>>` | 単項レベルまでしか直接結合できない。`a + b << c` はエラー |
| `&` `^` `\|` | 単項レベルまでしか直接結合できない。`a * b ^ c` はエラー |
| `&&` `\|\|` | 混在不可。`a && b \|\| c` はエラー |

### 括弧の付け方 (NG / OK)

```wgsl
// NG — 静的検証は通過するがブラウザ (Tint) が拒否:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 各乗算を括弧で囲む (同一演算子の連鎖 A ^ B ^ C は左結合で合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本書の掲載コードはこのパターンを含まない (`pack_hash3` の `+`/`*` 混在と `h ^ (h >> 16u)` は括弧済みのため仕様適合)。パックを書いたら第1段階と第2段階の両方を通すこと。

## 39. 独立した類似資料について

本書とほぼ同じ内容の社区資料として [GlitchHunterCoder/Bloxd-Essay の Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader) が存在する。こちらは本書より先に公開されているが、**本書の内容は glm が Bloxd の本体バンドルファイル (webpack チャンク群) を実際に解析して得た情報であり、コピペなどではない**。両者が一致するのは、同じ実装を独立に調べれば同じ結論に至るためである。

---

調査: ltf_ahel (glm を用いて調査)

[← 前の部](07-internals.md)・[マニュアルに戻る](README.md)

[← 前の部](08-apiv2.md)・[マニュアルに戻る](README.md)

# 第九部: API Version 3 移行ガイド

対象ビルド: `3ymzdd.main.fae4743f.js` — **2026-10-19 から本番稼働しているビルド**。bloxd.io が本番で配信するバンドルは、この部の当初の調査対象だった preprod デプロイとバイト単位で同一である (メインバンドルとシェーダーパックのチャンクの両方を md5 検証済み)。したがって本稿の内容はそのまま本番に当てはまる。パックモデルは v2 の形を保つ (`pack.json` のフィールド、ローダの制限、uniform レイアウトはいずれも同じ)。

第一部〜第七部は引き続き v2 基準で書かれている。この部では第八部と同じ順序で、v2 → v3 の移行点と v3 の新機能をまとめる。変換はほぼ機械的 (§47) だが、挙動が実際に変わる変更は1つだけであり — 既定ライトが emission をフォグで減衰させるようになり (§43) — さらに `blockId` は `blockFlags` に全面置換される (§42)。配布前には必ず実機コンパイルで確認すること。

今回の改訂で追加: **§49–§54** では移行そのものを超え、本番ビルドから復元したエンジン内部仕様を扱う — Lite レンダラがフックを実際にどう呼び出すか、実際の4モードのフォグ関数、`bloxdOpaqueBehind()` の正確な実装、ブロック登録からフックまでの blockFlags の完全な配送経路、実測ヘッダハッシュを含む検証パイプライン。これらは現在までに公開文書化されたパックシステムの最も深い事実であり、他のガイドが未解決としている疑問のいくつかを決着させる。

## 40. v2 パックの運命 (先に結論)

**2026-10-19 追記: v3 は preprod を離れ、現在ライブサイトが配信する版になった。** ロールアウト前に保存されたすべての v2 パック（v2 として配布された全パックを含む）は、本番で以下に述べるとおり失敗する。したがって今日パックを配布する者にとって、§47 の移行はもはや任意ではない。

このビルドは manifest の `apiVersion` が **3 と厳密一致すること**を要求し、**v2/v3 の並行サポートは存在しない**。v2 パックは読み込み時に「API バージョン不一致」のメッセージ（i18n キー、プレースホルダ表記）で拒否される:

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

保存済みパックのライフサイクルは v2 のまま（[第八部](08-apiv2.md) §31）: 各ビルドはエンジンヘッダをハッシュ化し、エンジン更新時に保存パックを自動で「要再チェック」にし、`apiVersion` が現行以外の保存パックはエラーではなく「実行不可」と表示する（上記ステータスメッセージが置換用パックを指す）。

## 41. pack.json と uniform バッファ (変わらないもの)

- 必須 manifest フィールドは不変: `{ apiVersion, name, author }`。
- ローダの制限は不変: 32MB zip / 1024 エントリ / 256 `.wgsl` ファイル / 合計コード 256KB / manifest 64KB。
- エンジンの uniform ブロックは形も不変: `@group(3) @binding(0)`、64 B で、宣言順に time、render offset、sun direction、eye position を格納する。レイアウトは `minBindingSize: 64` で登録され、正確なフィールド配置は `seconds: f32` @ バイト 0、`renderOffset: vec3i` @ 16、`sunDirection: vec3f` @ 32、`eyePosition: vec3f` @ 48 である。内部フィールド名が2つ変わった: `time` → `seconds`、`originOffset` → `renderOffset`。**バイトレイアウトは v2 と同一**であり、パックコード側に変化はない。パックは uniform を直接名指しできない（エンジンヘッダが engine-provided かつ read-only とし、「which packs can't name」と記す）ため、引き続きヘッダ関数 `bloxdSeconds()` / `bloxdRenderOffset()` を使う。
- パックの group 3 には文書化された2つ目の占有者が加わった: `@group(3) @binding(1)` は `bloxdOpaqueBehind()` が読む scene-depth テクスチャである（完全な実装は §51）。64 B の uniform は binding 0 のままで、パックはどちらの binding も名指しできない。

## 42. blockId から blockFlags へ: ブロック別マテリアルをビットフラグで表す (本命)

3つのフック入力構造体（`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`）すべてで、v2 のフィールド `blockId: u32` は `blockFlags: u32` に**置換**された。エンジン側の説明: *「この面がどの種類のブロックか: `bloxdBlockFlag*` ビット。面内で同一。」* エンジンがマテリアルデータ自体を渡すようになったため、数値 ID の範囲からマテリアルを推測したり、ワールド内に ID 表を維持したりする v2 の方法（[第八部](08-apiv2.md) §34）は不要になった。

ビットは名前付き定数として公開されている:

```wgsl
// テスト: (blockFlags & bloxdBlockFlagRock) != 0
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 値 | 定数 | 意味 (エンジン側の注記を要約) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 完全に不透明 — 葉や氷も含む。ガラス、水、溶岩、スポナー、ゴースト／不可視ブロックは含まない。 |
| 2 | `bloxdBlockFlagEmissive` | ブロック光を放つ。ネオン、ポータル、ランプ、溶岩、ビーコンのように。光る鉱石はどんなに弱くても該当。 |
| 4 | `bloxdBlockFlagVegetation` | 葉と、草ブロックの草 — 草ブロックは dirt でもある。サボテン、キノコブロック、干し草は含まない。 |
| 8 | `bloxdBlockFlagDirt` | 土と土壌。草ブロックを含む。Rocky Dirt は rock でもある。 |
| 16 | `bloxdBlockFlagSand` | 砂、赤砂、すべての砂岩 — 砂岩は rock でもある。 |
| 32 | `bloxdBlockFlagRock` | 石とその種類、安山岩、閃緑岩、花崗岩、砂利、鉱石、砂岩、Rocky Dirt、岩盤、黒曜石、マグマ。 |

複数のマテリアルからなるブロックは該当するフラグを**すべて**持つ（エンジン自身の例: 砂岩は sand かつ rock なので両方）。葉は vegetation だが dirt ではない。草ブロックは vegetation かつ dirt である。

vegetation / dirt / sand / rock フラグは、ブロックの登録**表示名**から割り当てられる（opaque / emissive は代わりにエンジン自身の不透明度・発光データから来る）: `Leaves` で終わる名前、または `Grass Block` は vegetation。`Dirt` / `Soil` を含む名前（およびすべての `Grass Block`）は dirt。完全に `Sand` と `Red Sand`、および `Sandstone` を含む名前は sand。`Stone` / `Andesite` / `Diorite` / `Granite` を含む名前、任意の `Ore`、さらに Yellowstone、Gravel、Bedrock、Obsidian、Magma、Rocky Dirt（および砂岩）は rock。

### 名前規則の正確な仕様 (任意のブロックのフラグを自分で導出する)

4つのマテリアルビットは、ブロックの登録表示名に対する固定の分類器から来る。バリアント名 (`|` より後) は先に取り除かれるため、バリアントは基底ブロックのフラグを継承する。次に:

| ビット | 規則 (取り除いた後の名前に対して評価) |
|---|---|
| vegetation | 名前が ` Leaves` で**終わる**、または ` Grass Block` で**終わる** |
| dirt | 名前が完全に `Dirt`、` Dirt` もしくは ` Soil` で**終わる**、または ` Grass Block` で**終わる** |
| sand | 名前が完全に `Sand` または `Red Sand`、または `Sandstone` を**含む** |
| rock | 名前が `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` のいずれかと完全一致、`Sandstone` を**含む**、` Ore` で**終わる**、または `Stone` / `Andesite` / `Diorite` / `Granite` を独立した単語として含む |

Yellowstone が明示されているのは、`Yellowstone` の中で `Stone` が独立した単語にならないためである。opaque と emissive は名前からは**来ない** — エンジン自身の不透明度とブロック光発光データから来るため、これらの規則では導出できない。

出典: エンジンの名前分類器 (モジュール 28537、バンドル `3ymzdd`)。全 7,861 の名前付きブロックに対して検証済み (2026-10-20)。

例 — マテリアル別のブロックティント:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 レシピへの影響: R-H の22要素の葉 ID 配列（[第八部](08-apiv2.md) §34）は `(blockFlags & bloxdBlockFlagVegetation) != 0` に縮約できる。ID ↔ ブロック名の対応表 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) はシェーダ以外の用途では引き続き有用だが、マテリアル表現のためにワールド内で参照する必要はなくなった。

### 草を除いて葉だけを選ぶ (よくある質問)

`vegetation` だけでは葉**と**草ブロックの草の両方に一致する。草ブロックは `dirt` も持つ。dirt を除外すれば葉だけになる — エンジン自身のフィールド説明が示す判別法である:

```wgsl
// 葉のみ: dirt のない vegetation。草ブロックは vegetation かつ dirt。
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 草ブロックのみ (地形サーフェスの草の面):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

ライブレジストリで検証済み（2026-10-20、バンドル `3ymzdd`）: `vegetation && !dirt` は45件の葉登録（22の基本型 — v2 R-H の ID 配列が測ったのと同じ22）に正確に一致し、`vegetation && dirt` は8件の草ブロックに正確に一致する。どちらの方向にも例外はない — レジストリ件数はそのビルド時点のものであり、新しいブロックが増えても規則は変わらない。面を選ぶには `vertex.normal`（上／下）と組み合わせる。たとえば草ブロックの上面だけ、など。

## 43. 関数名の変更と意味の変更

| v2 | v3 | 備考 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | ページ読み込みからの秒数（下記の f32 精度の注意） |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 同じ量: レンダー位置 + これ = ワールド座標 |
| `const bloxdTimeWrap: f32 = 3600` | **削除** | 周期はパック側で自分で定義する |
| `engineColour` (`BloxdLightIn` 内) | **削除**（14 → 13 フィールド） | `litColour` + フォグから再構築する |
| フック引数 `v` / `s` / `l` | `vertex` / `surface` / `light` | テンプレートの表記。シグネチャは不変 |

- **`bloxdSeconds()`** — ページ読み込みからの秒数。f32 では最初の4.5時間は1 ms未満刻み、9〜18時間では約4 ms刻みで進む。ヘッダは `bloxdSeconds() % period` という書き方を推奨している。0 から `period` まで数えて再び0に戻るため、削除された wrap 定数のきれいな代替になる。
- **`bloxdRenderOffset()`** — ブロック単位: 「レンダー位置 + これ = ワールド座標」。プレイヤーの移動に応じて変わるため、レンダー位置はプレイヤーの近くに保たれ、精度も保たれる。本ガイド全体で、v2 文書が noa ローカルオフセットと呼んでいたものは、今後一貫して**レンダー位置** / レンダーオフセットと呼ぶ。`bloxdOriginOffset()` が返していたのと同じ量である。
- **`bloxdTimeWrap` 削除** — 3600 秒でラップしていたパックは、自分で定数を宣言する。例: `const timeWrap: f32 = 3600.0;` として `% timeWrap`。
- **既定ライトの意味** — v2 の既定は `engineColour + emission × fogVisibility` だった。v3 の既定は `bloxdApplyFog(litColour + emission, light)` として合成する。**既定処理の内部で emission がフォグにより減衰する**ため、合成後の出力がフォグブレンドを一緒に通る。移植表:

  | v2 の式 | v3 の移植先 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 の式 `l.engineColour + s.emission * l.fogVisibility` の v3 移植:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **名前も意味も不変**: `bloxdEyePosition()`、`bloxdSunDirection()`、`bloxdFaceBlock()`、`bloxdApplyFog()`、`bloxdWorldPosition()`。

## 44. 新しいヘッダ定数: `bloxdPi` と `bloxdTau`

```wgsl
// 半回転と一回転 (ラジアン)。
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

三角関数の小技に便利で、パックが π をハードコードする必要もなくなった。名前の再利用に注意: 同名のパックローカル定数はヘッダの重複識別子チェックに衝突するので、コード内の `bloxdPi` / `bloxdTau` 再宣言を削除するか改名すること。

## 45. 6フックのテンプレート (液体フックが公式に表示される)

ビルドに同梱される既定のパックテキストは、地形／液体 × vertex／surface／light の**6フックすべて**を含み、各フックはエンジン既定値を返す。エンジンのコメントはこう紹介している: *「すべてのフックはエンジン既定値を返す。フックをコピーして出力を変えれば、シェーダーパックを作り始められる。」*

```wgsl
// すべてのフックはエンジン既定値を返す。フックをコピーして
// 出力を変えれば、シェーダーパックを作り始められる。

// strict ゲームでは地形をその場に保つ。ガードがないと、このフックが
// そこでシェーダーパック全体を無効にしてしまう。
#ifndef BLOXD_STRICT
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

// 水はこれらを使う。削除すると、水は地形フックを使う。
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
```

- フックのコメントは液体の規則を直接述べている: **水には3点セットが必要で、削除すると水は地形フックを再利用する**（v2 で知られていたフォールバック挙動、[第八部](08-apiv2.md) §36。今はテンプレート自体に書かれている）。
- `bloxdLiquidVertex` は `bloxdTerrainVertex` と同じ `#ifndef BLOXD_STRICT` ガードの内側にある — ガードなしでは、地形側の vertex 効果と同様、strict ゲームでパック全体を無効にしてしまう。
- テンプレートの表記は完全なパラメータ名 `vertex` / `surface` / `light` になった（v2 のテンプレートは短い `v` / `s` / `l` だった）。自分のコードのパラメータ名は自由で、重要なのはシグネチャだけである。

## 46. バリアント行列: プログラム軸とマクロの変更

バリアントは **strict × lighting × program** の行列で生成される — v2 と同じ8通りだが、terrain / liquid が明示的な軸になった。バリアント名は `allow|strict · unlit|lit · terrain|liquid` と綴られ、UI では `terrain` / `liquid`、`strict` / `non-strict`、`lighting on` / `lighting off` として表示される（エラー表示には「(only in {{variants}})」が付くことがある）。

| マクロ | 定義される場所 |
|---|---|
| `BLOXD_STRICT` | strict バリアント（両プログラム） |
| `BLOXD_LIGHTING` | lighting オンのバリアント（両プログラム） |
| `BLOXD_ALPHA` | **すべての液体バリアント**に加えて非 strict の**地形**バリアント |
| `BLOXD_SCENE_DEPTH` | **すべての液体バリアント** |

v2 の規則（[第八部](08-apiv2.md) §36）と比べて、作者向けの変更が2つある:

- **`BLOXD_ALPHA` は v2 から不変。** バリアント生成器にはリテラル行 `"liquid"!==program&&strict||push("BLOXD_ALPHA")` があり、JS の演算子優先順位により push をスキップするのは *(地形**かつ** strict)* の場合だけである。したがってマクロは**すべての液体バリアント (strict / 非 strict を問わず) と非 strict 地形**で定義され、strict 地形だけが省略する。液体側の `#ifdef BLOXD_ALPHA` コードはこれまでどおりそのままコンパイルされ、§49 の alpha 書き戻し (液体プログラムまたは非 strict バリアントに接ぎ木される) はこの集合と正確に一致する。
- **`BLOXD_SCENE_DEPTH` は液体バリアントで常に定義される。** したがって液体側では深度利用をガードなしで書いてよい（v2 の §35 と同じ）。地形フックでは引き続き `#ifdef BLOXD_SCENE_DEPTH` で囲む必要がある。

## 47. v2 → v3 移行チェックリスト

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** を3つの入力構造体すべてで。マテリアル表現は `bloxdBlockFlag*` 定数に対するビットテストで書く (§42)。v2 の ID 範囲ヒューリスティックは捨てる
3. **`bloxdTime()` → `bloxdSeconds()`**。削除された `bloxdTimeWrap` の代わりに自前の周期を宣言する (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **ライト計算を `engineColour` から `litColour` + フォグへ再構築**する (§43 の表に従う)。既定処理が emission をフォグで減衰させる点に注意
6. **液体フック**: 水を別扱いしたいときは `bloxdLiquid*` を明示的に定義する。省略すると地形フックへフォールバックする
7. **`BLOXD_ALPHA` の監査は不要** — バリアント集合は v2 から不変: すべての液体バリアントと非 strict 地形で定義され、strict 地形だけが省略する (§46)
8. **`bloxdPi` / `bloxdTau` を使う**。三角関数系の定数をハードコードしていた箇所で。ヘッダと重複するパックローカル再宣言を削除する
9. **strict ガードを維持**: vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む。テンプレートは `bloxdLiquidVertex` も地形側と同じようにガードする
10. **実機で検証** — シェーダーパック対応ゲームでコンパイル・テストする

## 48. その他の v3 変更と注意

- **検証は2段階のまま**（[第八部](08-apiv2.md) §38）: まず静的検証、次にブラウザの実際の WebGPU コンパイル。フックを呼ぶ生成スタブスニペットを介して行われ、エラーは元のソースファイル／行にマップされ、診断はマッピングを通じてエンジン側識別子の元の名前を復元する。
- **strict の診断は理由を名指しする**: 地形を動かす vertex フックは「… moves terrain, which strict games prevent.」、surface / light フック内の `discard` は「discard makes terrain see-through, which strict games prevent.」と報告される。設定 UI は引き続き「wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`」(`offInStrict`) の案内を表示する。
- **ローダのメッセージ**: エラーの種類と制限は不変。「Zip64 archives aren't supported.」は UI メッセージ (`loadZip64`) として表示される。パック UI の文字列インベントリは合計 57 個の `shaderPack:*` キーを持ち、読み込み段階のエラーにはほかに `loadNoWgsl` (`.wgsl` ファイルを1つも含まない zip) と `loadNotZip` (zip の end-of-archive シグネチャを持たないファイル) がある。
- **パック UI にゲーム内 WGSL エディタは同梱されていない。** 設定画面にシェーダーコードのエディタはなく、パックはゲーム外で zip ファイルとして作成する。(バンドルには CodeMirror エディタが実在するが、それはカスタムゲームのスクリプト UI 用の JavaScript エディタであり、WGSL サポートもパックシステムとの接続もない。)
- **ハードウェア要件**: Lite は `shader-f16` WebGPU 機能をサポートするドライバを要求する。古すぎるドライバは「Intel driver too old for Lite (no shader-f16)」のようなメッセージで拒否される。
- **ライティング変更は保存パックを再検証する**: 実行中にライティング設定が変わると、エンジンはパックチェックを再実行する (`changed → recheck`)。リプレイ視聴は同じフックを `changed: false` で呼び、再チェックをスキップする。
- **文言**: シェーダーパックを受け入れるゲームについての文は「in games that **support** them」になった。
- **対象タイトルの範囲**: パックが動作するゲームの集合は前ビルドから不変。

## 49. エンジン内部仕様: Lite レンダラがフックを呼び出す方法

§40–§48 はローダとヘッダが教えてくれることである。この節と続く4節は、エンジンが実行時に実際に何をしているかを本番バンドルから復元して文書化する（Lite レンダラ — 175 KB のチャンク。統合元ソースファイルの実名 `lite/terrainShaderPack.ts` がエラー文字列の中に残っている）。ここに書かれたことは、あなたが書くコードを変えるものではない。しかしフックが何を受け取るかについての推測をなくし、他のコミュニティガイドが未解決としている疑問のいくつかを決着させる。

レンダラは JavaScript からフックを「呼び出す」のではない。パックが検証を通ると、エンジンは**シェーダーテキスト内の固定アンカー行を置換することで、あなたのフック呼び出しを自身の地形 WGSL に接ぎ木する**。アンカーはちょうど1回だけ一致しなければならない — 0回または複数回の一致は `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` で中断する。

| 段階 | エンジンシェーダ内のアンカー行 | 接ぎ木される内容 |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` から `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` までの4行ブロック | `BloxdVertexIn` を構築し、vertex フックを呼び、`worldPos` を書き戻す — 接ぎ木は `let worldPos` を `var worldPos` にも書き換える |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` を構築し、surface フックを呼び、`baseColor` / `alpha` を書き戻す |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` の直前 | `let bloxdSpLitColour = color.rgb;` — フォグ前の色を捕捉する |
| light | フラグメントシェーダ末尾の `return color;` 行 | `BloxdLightIn` を構築し、light フックを呼び、`color` を書き戻す — フォグ混合の後 |

出荷バンドルから復元した接ぎ木コード（ライトレベルのサンプル式は、エンジン自身の整形が長くなる箇所を省略）:

```wgsl
// vertex 段階 — vertex フックを持つ非 strict バリアント
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* あなたの bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment 段階 — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* あなたの surface フック */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 液体プログラムまたは非 strict バリアントのときだけ接ぎ木される
```

```wgsl
// fragment 段階 — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* ライトレベルの varying */.rgb,        // blockLight
        /* 同じ varying の sky チャンネル */,     // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* 手持ちライト項 (下記) */,              // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — フォグがまったく無いときだけ黒
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* あなたの light フック */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

この接ぎ木から直接導ける強制事項が4つある:

- **strict 地形は surface フックの alpha 変更を無視する。** `alpha = bloxdSpSurface.alpha` の書き戻しは、液体プログラムまたは非 strict バリアントでのみ接ぎ木される — §46 のマクロ表の背後にある実装である。（strict 地形では `#ifdef BLOXD_ALPHA` コードはそもそもコンパイルされないが、ガードなしの alpha 書き込みもそこで破棄されることが確認された。）
- **vertex フックを宣言した strict バリアントは、それを実行しない。** エンジンはビルド時に `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs` と報告する。公式テンプレート (§45) が `bloxdLiquidVertex` を地形側と同じ `#ifndef BLOXD_STRICT` で囲むのはこのためである。
- `bloxdSp*` 識別子 — **合計14個**: `bloxdSpVertexIn`、`bloxdSpVertex`、`bloxdSpSurfaceIn`、`bloxdSpSurface`、`bloxdSpLightIn`、`bloxdSpLight`、`bloxdSpLitColour`、`bloxdSpSceneDepth`、`bloxdSpPixel`、`bloxdSpPositionW`、`bloxdSpZ`、`bloxdSpEye`、`bloxdSpScale`、`bloxdSpBehind` — はエンジン側の一時変数である。あなたのコードからは見えないが、診断や他人のリバースエンジニアリング出力には現れるので、見たらすぐ分かるようになっておく価値がある。
- **既定 surface のショートカット。** バリアントの surface フックが文字どおり `bloxdDefaultSurface` である場合、エンジンは `baseColor` / `alpha` の書き戻し行の接ぎ木をまるごと省略する — 既定処理がすでにその値を生成しているため、代入はデッドコードになるからである。変更していないフックの連鎖には何のコストもかからない。

**`BloxdLightIn` に実際に入るもの** — 接ぎ木コードからのフィールド別:

| フィールド | エンジン側の供給元 |
|---|---|
| `litColour` | フォグ混合の直前に捕捉されたフラグメント色（`bloxdSpLitColour` アンカー）— ヘッダの表現では「emission とフォグの前」 |
| `directional` | `vTerrainLambert` — シーンの方向ライトごとの `max(0, dot(normal, lightDirection)) × intensity` を頂点補間した合計（式は §54）。シーンに方向ライトがなければ0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — マテリアルごと、フレームごと |
| `blockLight` | デコードされたライトレベルの varying の `.rgb`（デコードは §54） |
| `skyLight` | 同じライトレベルの varying の sky チャンネル — *「Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING」*（ヘッダ文） |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | ライトレベルの varying の w チャンネルと、フレーム uniform の `uHeldLightPos` / `uHeldLightColour` から作られる手持ちライト項（減衰とチャンネル床の挙動は[第七部](07-internals.md) §26） |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **フォグがまったく無いシーン（モード0、§50）でのみ黒** |
| `fogVisibility` | クランプされたフォグ係数 — §50 の関数が返す正確な値 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying（法線はフラグメントごとに再正規化） |
| `blockFlags` | `vBlockFlags` フラット varying — §52 の完全な配送経路 |

古い資料を読むときの向き付けとして: 同じ接ぎ木アーキテクチャは v2 レンダラにも存在した。v3 の統合差分は `vBlockId` → `vBlockFlags` と液体バリアントの追加だけである。フックシステムは v2 → v3 の断絶をまたいでアーキテクチャ上安定している。

## 50. フォグ関数: 4つのモード、1つのフィールド

本番の地形シェーダから逐語的に復元:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponential
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponential squared
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = フォグ off (係数は 1.0 のまま)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — 1つの vec4 がすべてを駆動する。
- **シェーダには4つのモードが存在する: 0 = off、1 = exponential、2 = exponential-squared、3 = linear。** どのモードが動いても `fogVisibility` はクランプされた係数である — フィールドはちょうど1つで、モードフラグがパックに公開されることはない。
- Bloxd 自身のタイトルはモード3（linear）を駆動し、[第七部](07-internals.md) §25 で述べた32ブロック幅の帯を使う（`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)`）。したがって同部の「常に linear」という観察は、出荷済みゲームプレイについては引き続き正しい。しかし exponential モードは実在する稼働中のエンジンコードである — タイトルはクライアント更新なしに `vFogInfos.x` を切り替えてランプを変えられる。`distance(l.position, bloxdEyePosition())` を自分で計算する距離レシピ（R-B）は、モード切替に影響されないため、距離駆動の見た目を書く堅牢な方法である。
- これにより「エンジンは実際にどのフォグランプを使うのか」という問いがソースから決着する: 4つすべてが実装されており、出荷タイトルは linear を使う。（同じ関数はヘッダの fogColour に関するコメントも説明する — モード0だけが `fogColour` を黒で届けるケースであり、Bloxd のゲームはモード0を出荷しない。代わりにフォグを遠方へ押しやる。[第七部](07-internals.md) §25。）

## 51. bloxdOpaqueBehind(): 正確な実装

関数全体を本番ビルドから逐語的に復元:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **深度テクスチャは `@group(3) @binding(1)` にある** — group 3 はパック自身の group である。binding 0 が 64 B の `bloxdPackInputs` uniform (§41)、binding 1 がこの深度テクスチャだ。どちらもエンジン提供で、あなたの側からは名指しできない。
- **深度テクスチャは unfilterable-float のフラグメント専用リソースである。** バインドグループレイアウトはこれを `texture: { sampleType: "unfilterable-float" }`、可視性 `GPUShaderStage.FRAGMENT` のみとして登録する — `bloxdOpaqueBehind()` が `textureSample` ではなく `textureLoad` (明示的なテクセル座標、mip レベル 0) で組まれているのはまさにこのためで、このテクスチャではハードウェアフィルタリングがそもそも使えない。
- `z ≤ 0` は深度サンプルが何にも当たらなかったこと（far plane／空）を意味する: `found = false` で、`position` / `distance` は意味を持たない — 必ず `found` を先に確認する。
- 返される位置は**レイスケールの交点**である: 不透明面を `eye + (fragment − eye) × max(z / viewDepth, 1)` に置く。`distance` は目からその点までの距離 — 水面パックにとっては実質「固いものに当たるまでレイがどれだけ水を通過したか」であり、これが2つ目の深度バッファなしで深度ティント水レシピを成立させている。

## 52. blockFlags の全経路: 登録からフックまで

§42 はビットの意味を説明した。この節は、フラグビットがブロック登録からフックまで旅する完全な経路である — すべてのホップを本番ソースから確認しており、ヘッダの「面内で同一」がバイトレベルまで正しいことも証明する。

**1. 登録（ブロック定義データベース）。** 各ブロックのフラグは登録時に1回計算される:

```js
flags[id] = nameFlags                     // 表示名の規則 (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // opaque ビット — エンジンの不透明度データ
          | (anyFaceEmission >= 1       ? 2 : 0);  // emissive ビット — ブロック光の発光データ
```

表示名の規則が扱うのは4つのマテリアルビットだけである。2つの物理ビットは別のエンジンデータから来る — `opaque` はブロック定義から直接、`emissive` は面ごとのブロック光発光配列から。ヘッダの「光る鉱石はどんなに弱くても該当」は文字通りで、発光が1以上の面があればビットが立つ。

**2. ブロック単位 → マテリアル単位（メッシャー初期化）。** 地形はブロック ID 単位ではなく*マテリアル*単位で描画されるため、フラグはマテリアル表に再集計される（マテリアル ID で索引する `Uint16Array`。各マテリアルは所有ブロックの最初の面のフラグを取る）。この表はメッシュ生成 Web Worker に送られる — ただし**パックパイプラインが有効な構成でのみ**。それ以外では表は `null` で、フラグバイトは一切書き込まれない。パックを使わないプレイヤーは、構造上ゼロのオーバーヘッドしか払わない。

**3. 頂点バイトへ（メッシャーワーカー）。** フラグは既存のインターリーブ頂点データの2バイトの空きに乗る:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 下位 8 ビット → colour 属性の alpha バイト
        buffer[o + normalOffset + 3] = flags >> 8;    // 上位 8 ビット → normal 属性の w バイト
    }
}
```

面の4頂点すべてが同じ値を受け取る — これが「面内で同一」の実装レベルの意味である。

**4. GPU 側のデコード（Lite 地形シェーダ）。** 2バイトは `blockFlagWords: vec2u` 頂点属性（location 7、パックパイプラインが有効なときだけ存在）として運ばれ、vertex 段階で再結合される:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` は `@interpolate(flat)` で宣言されている — 面ごとの定数がフラグメント段階まで続くため、§42 のビットテストは面内で安定し、面の途中でブレンドされることは決してない。

- パイプラインは**16ビット**分の容量を確保している（このデコードは2バイト全体を再結合する）が、v3 が定義するのは6ビットだけである — 将来のフラグは頂点フォーマットの変更も API バンプもなしに追加できる。
- packed-vertex モードでは、同じ2バイトが専用属性ではなく `packed.y` と colour ワードの上位バイトに入る — 値は同じで、容器が違う。
- このフラグについて最もよく聞かれる葉と草の判別については、§42 の[草を除いて葉だけを選ぶ](#草を除いて葉だけを選ぶ-よくある質問)を参照。

## 53. 検証内部仕様: HEADER_VERSION、シグネチャ、予約名

**実測ヘッダハッシュ。** すべてのパック検証はエンジンの `HEADER_VERSION` で刻印される。本番の検証モジュールを直接実行すると（ハーネスの注記は §54 の末尾）、次の値が測れる:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 本番稼働バンドルから実測
```

これは FNV-1a-32 ハッシュ（`6.` 接頭辞）で、5つの入力に対する: バリアントごとに前処理・トークン化されたエンジンヘッダ（8バリアント分のエントリ）、パーサの WGSL 字句宇宙全体、4つのマクロ名、特殊関数マップ、そして `BloxdPackInputs` 宣言とその `@group(3) @binding(0)` uniform 行。作者にとっての帰結は2つ:

- **エンジン側のヘッダ編集はハッシュを変える** — エンジン更新後に保存パックが自動で「要再チェック」になる仕組みの正体である（[第八部](08-apiv2.md) §31）。
- ハッシュが覆うのは*エンジンヘッダ*であり、あなたのコードではない。エンジン更新をまたいで読み込まれ続けるパックは「まだ有効」なのではなく、単にヘッダ変更に引っかかっていないだけである。manifest が関与する唯一のバージョン検査は `apiVersion` ゲートである (§40)。

**フックシグネチャ検査: 型はトークン厳密、名前は自由。** バリデータはフック slot ごとに1つのシグネチャを持つ:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

照合は**トークン単位**: パラメータ型名は厳密一致、`->` と戻り値型も厳密一致、パラメータ数とカンマ位置も検査される。パラメータ*名*は自由 — パラメータ位置の任意の識別子が受け入れられる。だから `fn bloxdTerrainLight(s, l)` は、テンプレートが `(surface, light)` と綴っていてもコンパイルできる。light フックはちょうど2引数を取る。

**予約名。** 規則は単一の正規表現 `/^bloxd/i` である。`bloxd` で始まる識別子はすべて予約 — `bloxd*` はすべてエンジン提供で、パックはその名前空間に宣言を置けない（§44 の `bloxdPi` / `bloxdTau` 再宣言が衝突する理由でもある）。

**特殊関数。** v3 で登録されているのはちょうど1つ:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「special」は*マクロに結び付いた*という意味である — 可用性がバリアントシンボルに依存するエンジン関数。正しい使用を強制するガード診断が2つある:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex フックが surface / light 専用関数に到達した場合。
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — たとえば `#ifdef BLOXD_SCENE_DEPTH` で囲まずに地形側で `bloxdOpaqueBehind()` を呼んだ場合。

**エンジンヘッダ（prelude）の固定。** v3 ヘッダは 5,637 バイトの文字列で、`// Engine-provided and read-only, prepended to all packs. apiVersion 3.` で始まる。エンジン自身の WGSL プリプロセッサがバリアントごとに評価する `#if` / `#ifdef` ディレクティブを含む — エンジンは本当に `#if` 式評価を実行し、不正な式は `Cannot evaluate #if ...` でエラーになる。本ガイドのすべての構造体、関数シグネチャ、引用コメントはこのレンダリング済みテキストに由来するため、ガイドと出荷ヘッダがずれることはない。

**作者向けパーサ注記。**

- パック側の関数はエンジンシェーダに統合されるとき `pack_` 接頭辞で改名される（衝突回避）。診断は元の名前にマップし直す — [第八部](08-apiv2.md) §38 が第2検証段階について説明したのと同じ機構。
- 未宣言識別子のメッセージは `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`。`_ can only be the target of a phony assignment, as in _ = f();` と `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` が、新たに確認されたメッセージ群を補完する。
- パーサの字句宇宙には**標準 WGSL ではない**識別子が含まれる: `bufferView`、`bufferArrayView`、`bufferLength`、`atomicStoreMax`、`atomicStoreMin`。エンジンはこれらを組み込みとして知っているが、特定ブラウザの WGSL 実装が提供する保証はない — 配布パックをこれらに依存させてはならない。

## 54. 確認済みの定数・制限・レイアウト

本番の Lite レンダラから直接得た、地形プログラムの完全なリソースレイアウト:

| Binding | 内容 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f、`view` mat4x4f、`vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`、`uSkyLightColour`、`uAmbientLightColour`、**`vFogInfos`**、`vFogColor`、`outputHeight`、`sceneAmbient`、**`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = レンダーフレームへの平行移動、w = フェードイン可視性 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`、`ambientAndCutoff`、`emissiveAndLevel`、`anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — パック uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — 深度テクスチャ (§51) |

- **方向ライトは最大4灯でハードキャップ**されている。シーンがそれ以上を登録しようとすると、レンダラは `Terrain supports 4 directional lights, not ${n}` でエラーになる。`l.directional` は存在する灯数（0〜4。Bloxd 自身のシーンは2灯 — [第七部](07-internals.md) §27）の Lambert 合計である。地形はまた、尊重できないライトについて警告を出す (逐語): 起動後に追加されたライト — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`、色付きのライト — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`、メッシュフィルタ付きのライト — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **地形プログラムの命名**: パイプラインキャッシュキーは `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` と読める — パックは `-sp{variant}` 接尾辞として現れ、§46 のバリアントごとに1プログラムになる。ウォッチャ (`watchPipelineFailures`) はライブのパイプライン名を `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` と照合し、パイプラインのコンパイル失敗時に対応するパックバリアントを再チェックする。GPU デバイスロスト (`device.lost`) のときはチェックしない。
- **`BLOXD_TERRAIN_DIRECTIONAL` はエンジン内部マクロ**である（dirLightCount > 0 のときに定義）。prelude の4つには含まれず、パックコードには決して届かない — ただしエンジン自身のシェーダの WGSL ダンプには現れるので、知っておくと混乱を避けられる。
- **ライトレベルのデコード**: `aPackedLightLevels` 頂点属性は4つのニブルを詰めた1つの f32 で、各ニブルは15で割られる。rgb = 色付きブロック光、a = sky／held チャンネル。vertex 段階で `vLightLevels` varying にデコードされ、`blockLight` は `.rgb`、sky／held チャンネルは `.w` を読む。エンジンは補間前に rgb チャンネルを最も明るいチャンネルの35%で床打ちする — [第七部](07-internals.md) §26 がゲームプレイから文書化したリフトのエンジン側アンカーである。
- **`vTerrainLambert`**（`directional` の供給元、§49）は、有効な方向ライトに関する合計として生成される: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`。`BLOXD_TERRAIN_DIRECTIONAL` でガードされる。
- **インデックスバッファは最初の大メッシュで 32 ビットになる。** Lite レンダラが `Uint16Array` のインデックスを選ぶのは、すべてのインデックス値が 65,534 以下である間だけである — いずれかのインデックスが 65,535 に達した時点で、バッファは `Uint32Array` になる (バッファごとに `is32Bits` フラグで追跡される)。実際には: 頂点が最大 65,535 のチャンクメッシュは 16 ビットインデックスに収まり、ちょうど 65,536 頂点のメッシュは必然的に 65,535 のインデックスを出力し、バッファ全体が 32 ビットに切り替わる。
- **manifest 読み込みの詳細**: `__MACOSX/` 配下の zip エントリ、`._` 接頭辞のファイル、`.DS_Store` は除外される（macOS アーカイブのノイズ）。`pack.json` は小文字化したパス比較で探され、0件なら `loadNoManifest`、2件以上なら `loadDuplicateManifest`。manifest の読み込みは 65,536 バイトで上限される。
- **これらすべての検証方法**: 本番バンドルのモジュールを復元し（165チャンク。webpack のレジストリはこのバンドルで 4,951 モジュールを数える — 非同期の子依存を含めるかどうかでモジュール数は数個変わるため、正確な数はバンドル固有のものとして扱うこと）、Node.js 上の webpack 互換ハーネスで実行した。実測 `HEADER_VERSION` (§53)、レンダリングされた 5,637 バイトのヘッダ、バリアント表の正規順序、特殊関数マップはすべて*出荷コードの実行*から得たもので、文字列を読んだだけではない。同じハーネスはコミュニティ版 `pack_check` v6 の自然な中核になる — エンジン自身のバリデータをパックに対して実行すれば、その判定を正確に再現できる。

---

調査: ltf_ahel (glm を用いて調査)

[← 前の部](08-apiv2.md)・[マニュアルに戻る](README.md)

