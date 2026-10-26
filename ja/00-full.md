# Bloxd.io シェーダーパックの作り方 (完全版)

Bloxd.io のシェーダーパック (WebGPU レンダラー専用) を自作・配布するための手順書。

> 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる。  
> 本書はAIの支援を受けて作成されており、内容の正確性は保証されない。実際のゲーム動作で確認すること。  
> 最終レビュー: 2026-10-27 (バンドル比較で v4 本番ロールアウトを確認 — ビルド `cnty9`、本番と preprod が同一。テクスチャ API・フォグ改名・strict ゲームの内部仕様を本番ビルドから復元 — 第十部 §63〜§65)。完全なリファレンス資材は第十一部 (`11-reference.md`) として組み込み済み: 逐語復元したエンジンヘッダ全文と、利用可能 905 名すべての実測カタログである。それでもレシピは読み込み画面・実機コンパイルで継続検証すること。  
> シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パックは純粋な WGSL  
> (JS 実行・通信不可) のため、通常の記述で危険なことは起きない。

[マニュアルに戻る](README.md)・[次の部 →](02-api.md)

# 第一部: 作り方

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

## 1. 概要と前提

- シェーダーパックは **WebGPU レンダラー専用**。パック導入中は設定の WebGPU レンダラーが強制的にオンになる
- パックは **WGSL の制限付きサブセット**で記述する。対象は**地形 (terrain) と液体 (liquid)** の見た目のみ
- できること: 色・透明度・発光の変更、照明の組み直し、投影風の影 (R9.12)、(一部ゲーム限定で) 頂点移動
- できないこと: 独自テクスチャの追加、ポストプロセス (ブルーム等)、太陽と一緒に回るピクセル精度の影 (シャドウマップ) と本物の反射 (SSR) の新設、空やエンティティへの適用 (既存ブロックテクスチャアトラスの**サンプリングは v4 で可能になった** — `bloxdTexel`、[第十部](10-apiv4.md) §57。テクスチャの追加は引き続きテクスチャパック機構の仕事)
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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> 現行ビルドは 2026-10-26 以降 `apiVersion: 4` を要求し、v1/v2/v3 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) と [第十部](10-apiv4.md) の変更を確認すること。

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

> **2026-10-26 に取代された: 現行 API はバージョン 4** — v3 パックはここで v2 について述べているのと同じ形で読み込み時に拒否される。本部を適用した上で[第十部](10-apiv4.md) (v3 → v4: テクスチャ API、`fogAlpha` 改名、`bloxdFragmentBlockPosition`、`hit`) を適用すること。本部の内部仕様 (§49〜§54) は計測対象だった v3 ビルドに対しては引き続き正確である。

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

[← 前の部](09-apiv3.md)・[マニュアルに戻る](README.md)

# 第十部: API Version 4 移行ガイド

対象ビルド: `cnty9.main.669f8081.js` — **2026-10-26 から本番と preprod が同時に稼働しているビルド**。v3 ロールアウト (preprod ビルドの本番昇格) と違い、v4 は両環境を一斉に同じ新バンドルへ切り替えた。両者のバンドルはバイト単位で同一であり (メインとシェーダーパック系チャンクの全てを md5 検証済み)、本稿の内容はそのまま本番に当てはまる。このリリースではバンドル構成も再編された — メインバンドルは 4.73 MB から 3.03 MB へ縮小 (-36%)、チャンク数は 169 から 193 へ増加し、シェーダーパックのパイプライン (ローダ、バリデータ、コード生成器、WebGPU コンパイラ) は c49〜c54 の連続クラスタに集約された。パックモデル自体は形を保つ: `pack.json` のフィールド、ローダの制限、64 B の uniform、6 つのフックはいずれも同じである。

このリリースで変わり、かつバンドルに**入っていない**ことが1つある: **エンジンがリファレンスファイルを名指しで引用するようになった**ことである。エンジン自身のエラーメッセージが `bloxd-api.wgsl` (注釈付きエンジンヘッダ) と `BLOCK_TEXTURES.md` (テクスチャ名の完全リスト) を参照する (`...BLOCK_TEXTURES.md lists them.`)。本ガイドは読者をよそへ誘導せず、両方の中身を自ら掲載する: ライブビルドから逐語復元した完全ヘッダと、利用可能 905 名すべての完全カタログを第十一部 (`11-reference.md`) として組み込んだ。本部のパック向け事実はすべて本番バンドルから復元している。

v4 の変更点を一目で:

| 領域 | v3 | v4 |
|---|---|---|
| `pack.json` の `apiVersion` | `3` (厳密) | **`4` (厳密)** — v3 パックは読み込み時に拒否 |
| テクスチャアクセス | なし (「サンプリング不可」) | **新テクスチャ API**: `bloxdTexel()` / `bloxdTextureSize()` / `bloxdTextureId*` 定数 |
| フック入力 | 13/5 フィールド | **各 +4 フィールド**: `textureId` / `textureRotation` / `uv` / `mipLevel` (surface と light の両方) |
| `fogVisibility` | `1 = フォグなし` | 改名 **`fogAlpha`**、意味は**反転**: `0 = フォグなし、1 = fogColour のみ` |
| `bloxdFaceBlock()` | — | 改名 **`bloxdFragmentBlockPosition()`** (中身は同一) |
| `BloxdOpaqueBehind.found` | `found` | 改名 **`hit`** |
| strict ゲーム | ポリシーとガードを文書化 | バンドル内バリデータによる**強制**に (診断メッセージ付き、§60) |
| その他 | — | 凍結維持: 6 フック / `blockFlags` ビット / uniform レイアウト / ローダ制限 / バリアント行列 / group 3 の binding |

v3 からの変換は機械的 (§61) だが、静かな罠が1つある: `fogAlpha` の反転を無視して他を全部移植すると、フォグ依存コードは**反転したフォグで問題なくコンパイル通過**する。いつも通り、配布前に実機コンパイルで確認すること。

## 55. v3 パックの運命 (先に結論)

**v3 パック (v3 として配布された全パックを含む) は、本番で読み込み時に正確に失敗する。** ローダは `manifest.apiVersion !== 4` を JavaScript の厳密不等価 `!==` で比較するため、この判定は型と値の両方で厳密である: JSON は*数値*の `4` を持たねばならない。文字列 `"4"` は失敗し、設定画面には JSON 表記つきで表示される (`{{packVersion}}` は `JSON.stringify` されるため `This pack is for shader pack API version "4"...` と引用符付き — 文字列を書いた際の判別に使える)。

読み込み時の 2 つのメッセージを、稼働中の i18n 辞書からそのまま引用する:

> `pack.json needs "apiVersion": {{version}}.` — キーが丸ごと欠けている場合。
>
> `This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — キーは存在するが 4 と一致しない場合。

保存済みの (以前動いていた) v3 パックはプレイヤーに何も例外を出さない。保存パックの判定は `{kind: "none", reason: "otherApiVersion"}` となり、パックは静かに非アクティブになり、シェーダーパック設定タブがこの状況を説明する:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

`apiVersion` 周りの manifest 規則は他は不変で、ローダが他の何よりも先に強制するため再掲する:

- `pack.json` はパックのルートに JSON オブジェクトであること (配列でも数値でも不可)。
- `apiVersion` は存在して `=== 4` であること。
- `name` は必須・文字列・トリム後に空でないこと。
- `author` は任意だが、存在するなら文字列であること — 明示的な `null` は拒否される (`pack.json's "author" must be a string.`)。
- これ以外の manifest の内容はローダから無視される。

## 56. pack.json と uniform バッファ (変わらないもの)

テクスチャ以外のパックモデルは v3 からバイト単位で引き継がれるため、[第九部](09-apiv3.md) §41 が引き続き参照先になる。v4 での再実測値を稼働中のローダチャンク (c51) から示す:

| 制限 | 値 | 超過時のメッセージ |
|---|---|---|
| パックあたりの `.wgsl` ファイル | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` 合計ソース | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` のサイズ | 64 KB | `pack.json is over 64 KB.` |
| zip サイズ | 32 MB | `The zip is over 32 MB.` |
| zip エントリ数 | 1,024 | `The zip has more than 1024 entries.` |
| zip の形状 | — | 分割 zip・Zip64・暗号化エントリ・未サポート圧縮方式はそれぞれ専用メッセージで拒否。全ファイル有効 UTF-8 であること。`pack.json` は 1 つだけ。重複パス不可 |

フレーム毎の uniform は無変更: `@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs`、64 バイト、std140 風レイアウト:

| オフセット | フィールド | 型 | 備考 |
|---|---|---|---|
| 0 | `seconds` | `f32` | `bloxdSeconds()` の実体 |
| 16 | `renderOffset` | `vec3i` | `bloxdRenderOffset()` の実体 |
| 32 | `sunDirection` | `vec3f` | `bloxdSunDirection()` の実体 |
| 48 | `eyePosition` | `vec3f` | `bloxdEyePosition()` の実体 |

6 フックのテンプレートはコメントの整形のみ (1059 → 1122 バイト、§45 が説明する v3 の挙動は不変)。v4 のテンプレートをそのまま引用する — 引き続き最良の出発スケルトンであり、引き続き strict ゲーム対策のコピー元である:

```wgsl
// Every hook here returns its engine default.
// Copy a hook and change its output to start a shader pack.

// Strict games keep terrain where it is. We use #ifndef to define the hook for
// non-strict games, but to disable it in strict games, so our pack can stay on.
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

// Water uses liquid hooks. If deleted, water uses your terrain hooks instead.
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

## 57. テクスチャ API: `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` (注目機能)

v3 パックは面の*色*は読めたが*テクスチャ*は読めなかった。v4 はブロックテクスチャアトラスそのものを開放する: 新関数 3 種、名前付き定数ファミリー 1 種、入力フィールド 4 個 (§58)。ヘッダ自身の一行要約: *"This face's texture. Compare with `bloxdTextureId*`."*

### 57.1 `bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f`

ブロックテクスチャアトラスを**エンジン自身のサンプラと完全に同じ方法**でサンプリングする — 同じ `texture_2d_array<f32>` アトラス、同じ `atlasSampler`、`round(mipLevel)` での `textureSampleLevel` — したがって自分が読んだテクセルとエンジンが描画したテクセルは構造的に一致する。セマンティクス (すべて生成 WGSL から復元、§63 に逐語ソース):

- **`textureId == 0` は `vec4f(1.0)` (白) を返す。** これが「テクスチャなし」の id であり、テクスチャを持たない面では 4 つの入力フィールドもこの値を運ぶため、`bloxdTexel(surface.textureId, ...)` は常に安全に呼べる。
- **アニメーションテクスチャは自動で現在フレームを返す。** フレームはゲームのアニメーションクロックで進む — 停めたりステップしたりはできないし、する必要もない: アニメーションテクスチャの id をサンプリングすることが*生きたフレーム*のサンプリングである (フレーム数式は §63.3)。
- **`mipLevel` はエンジン自身と同じ方式でクランプされる:** `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`。範囲外の mip はエラーではなく飽和する。
- **現在のフラグメントの `textureRotation` が渡した uv に適用される** — 57.4 を参照。唯一、実際に視覚的帰結のある繊細な点である。

`textureId` は**1 起点**: `bloxdTextureIdGrassTop` が id であり、エンジンがそれのためにサンプリングするアトラスレイヤは `id - 1`。id はアトラス配置ではなくテクスチャ*名*に対して安定 — エンジンはビルドをまたいでアトラスを自由に再配置するが、`bloxdTextureId*` の比較は「このテクスチャ」という意味を保ち続ける。

### 57.2 `bloxdTextureSize(mipLevel: f32) -> vec2u`

`textureDimensions(textureAtlas0, <クランプ済み mip>)` — その mip でのアトラスのテクセルサイズ。各テクスチャはそのアトラスの配列レイヤ 1 枚を占めるため、これは*mip レベルにおける任意の 1 テクスチャのテクセルサイズ*でもある (1 アトラス階層内の全ブロックテクスチャは同じ正方形サイズ)。テクセル格子系の効果には `bloxdTexel` と組み合わせる:

```wgsl
// この面のテクスチャをテクセル整列で再サンプルする「ドット絵」スタイル。
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

### 57.3 `bloxdTextureId*`: テクスチャ名定数

利用可能な全テクスチャ名が比較可能な `const` になる — 綴りは**テクスチャのファイル名を CamelCase 化**したもの:

| テクスチャファイル | 定数 | 備考 |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | エンジン自身のサンプル例 |
| `lava0.png` (フレーム `lava0`〜`lava7`) | `bloxdTextureIdLava` | アニメーション族: フレーム接尾辞は正規名から落ちる |
| `black_portal0.png` (フレーム 0〜3) | `bloxdTextureIdBlackPortal` | 同じ規則 |
| `radar_screen0` (回転コピー `[rot[1`〜`[rot[4`) | `bloxdTextureIdRadarScreen0` | 回転族: ルート名に畳み込まれる |

綴り規則 (バリデータから復元): 名前を非英数字の連続で分割し、各部分を頭文字大文字化し、`bloxdTextureId` 接頭辞の後に連結する。逆方向の照合は**大小文字・アンダースコア非感受** (エンジンは照合前に同じ折り畳みを自分の綴りにも適用する) で、解決しない綴りには 3 つの専用エラーファミリーがある — すべて稼働中バリデータからの逐語引用:

> **接頭辞の綴り間違い / 大小文字違い:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **アニメーションテクスチャのフレーム:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **回転コピー:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **折り畳み後に曖昧:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **未発見 (提案つき):** `There's no texture called X. Did you mean bloxdTextureIdY?` — 提案の閾値はレーベンシュタイン距離 `max(2, floor(len/4)) + 1`。
>
> **未発見 (提案なし):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

最後のメッセージが指す先の中身を本ガイドは自ら掲載している: 実測 id 付きの利用可能 905 名全一覧と回転族・アニメーション族の表が §68 (第十一部 `11-reference.md`) であり、その背後のレジストリ測定と畳み込み規則は §64 にある。

### 57.4 回転の繊細さ — そして中立サンプリングヘルパー

`bloxdTexel` は渡された uv を**現在のフラグメントの** `textureRotation` で逆回転する — 渡した id が何であっても。よくある 2 ケースではこれは正確に正しい:

- **この面自身のテクスチャを再サンプリング**する場合に `surface.uv` を渡す — uv は面の回転済み座標系にあり、逆回転がアトラス座標系へ変換し、正しいテクセルが得られる。これが意図された主用途である。
- **別のテクスチャ**を*アトラス基準*で作った uv でサンプリングする場合で、面の回転が 0 でないとき — 逆回転はやはり発動し、サンプルは回転した位置に着地する。これが罠。

エンジンはテクスチャ毎の回転を参照できず (回転は面のジオメトリデータ、§63.2)、常にフラグメントの値を使う。別テクスチャを回転中立にサンプルするには、uv を同じ四半回転だけ事前に回転 — 逆回転の逆 — して相殺する:

```wgsl
// 回転中立テクセルサンプリング: bloxdTexel の逆回転 (この面の textureRotation による)
// が相殺されるよう、uv を事前に回転させる。フックから surface.textureRotation を r として渡す。
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {        // 回転: (x,y) -> (1-y, x)
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) { // (x,y) -> (1-x, 1-y)
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) { // (x,y) -> (y, 1-x)
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}

// 使い方 (サーフェスフック内):
//   let t = texelNeutral(bloxdTextureIdLava, fract(surface.uv),
//                        surface.mipLevel, surface.textureRotation);
```

(`textureRotation == 0` なら補正は不要。実際にはほとんどの面は 0 を持つが、配布パックはそれを前提にしてはならない。)

### 57.5 実働例

**テクセル輝度からの emission。** エンジンはすでに texture × tint × AO を `surface.colour` に掛けているが、ここでは代わりにテクスチャ自身の明るさから emission を駆動する。面の mip より 1 つ上をサンプリングして、距離に強いソフトでブロック的な平均を得る:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // +1 mip = 1/4 解像度: 4x4 テクセルの平均。安価で安定
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if ((surface.blockFlags & bloxdBlockFlagEmissive) != 0u) {
        // エンジンの見た目を保ちつつ、テクスチャ自身に比例した穏やかな発光源を追加
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

**テクスチャ特化の効果。** `textureId` を比較して選別されたテクスチャだけに作用する — 「色から推測」の v4 版であり、例えば鉱石をきらめかせる正規の方法:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        // きらめき: ワールド座標 + 時間からの位相
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

**被写界風の距離ブラー** — 遠くは高 mip、近くはネイティブ mip を読む:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        // この面のエンジン自身のテクセル — tint と AO を含んでいる
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // 除算ガード
            // 距離とともにブラー段が上がる、最大 +3 mip
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            // 比率で tint と AO を復元: (t / own) * colour
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(比率トリックはエンジンの `colour = texture × tint × AO` を保存する: ブレンド済みテクセルをネイティブテクセルで割るとテクスチャ内容が打ち消され、`surface.colour` に掛け戻すブラー係数だけが残る。白 `vec4f(1.0)` の読み — テクスチャなしの面とアンチX線で刈り取られた面 — ではガードが効果全体をスキップする。)

### 57.6 テクスチャ API が届かない場所

- **バーテックスフックからは呼べない。** `bloxdTexel` / `bloxdTextureSize` は surface/light フックの関数であり、バーテックスフックから到達すると "reaches" 診断で拒否される (§65.3)。
- **テクスチャを追加することはできない。** アトラスはエンジンのもの。API はそれを読むだけ。カスタムテクスチャはテクスチャパック機構の仕事のままである。
- **非アトラスのレンダラ構成ではスタブに劣化する。** 地形マテリアルがアトラス方式でない構成では、エンジンは `bloxdTextureSize() -> vec2u(1u)` と `bloxdTexel(...) -> vec4f(1.0)` をコンパイルし、4 つの入力フィールドは `0u, 0u, vec2f(0.0), 0.0` を流す。実アトラス向けに書いたコードはそこでもコンパイルも実行も通る — ただ白いテクセルと 1×1 のサイズを見るだけ。`textureId == 0` を許容するように書いたコードはこれも許容する。

## 58. 新しい 4 つの入力フィールド

`BloxdSurfaceIn` と `BloxdLightIn` の両方に同じ 4 フィールドが末尾へ加わる。v4 ヘッダからの引用 (light 構造体は surface 構造体と同じ 4 つ組を運ぶ — light フックはサーフェスフックから何も運ばなくてもテクスチャに基づいて動ける):

```wgsl
    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
```

- **`textureId`** — 安定した名由来の id (§57.3)。テクスチャなしの面では `0`、それ以外では決して `0` にならない。
- **`textureRotation`** — `0`〜`3`、面がテクスチャを*表示する*向きの四半回転 (時計回り)。ジオメトリ/テクスチャパックの上書きに由来 (§63.2)。両フックで同じ値。
- **`uv`** — **ブロック単位**の補間テクスチャ座標: 面積 1 ブロックが uv の 1.0 に対応するため、`fract(uv)` がブロック内のテクスチャタイルになる — ヘッダ自身の表現。石を繰り返した壁では、`uv` は壁に沿って増え、`fract(uv)` がタイリングする。
- **`mipLevel`** — このフラグメント用にエンジンが選んだ mip。テクセル位置の画面空間微分から導出され、アトラスのレベル範囲にクランプされる (§63.1 に正確な式)。画面を埋める面では `0`、距離と斜め角度とともに上昇する。これは*読み取り専用* — エンジンのサンプリングをこれで操ることはできないが、`bloxdTexel` に渡す (`± n` しても) ことはできる。

v4 固有のレシピ案 — **ワールド座標なしでブロック格子に同期したディテールパターン**:

```wgsl
// テクスチャ自身のタイリングにキーした細かい格子: テクスチャ付きの全面で視認でき、
// カメラ移動に対して安定し、浮動小数のワールド座標ドリフトもない。
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let cell = fract(surface.uv * 8.0);               // ブロックあたり 8x8 サブタイル
    let edge = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
    out.colour *= mix(vec3f(0.86), vec3f(1.0), step(0.06, edge));
    return out;
}
```


## 59. 改名と意味変更

4 つの改名があり、うち 1 つは意味が反転する。ヘッダのその他すべて — `bloxdPi` / `bloxdTau`、6 つの `bloxdBlockFlag*` 定数とそのビット (1/2/4/8/16/32)、`bloxdEyePosition` / `bloxdRenderOffset` / `bloxdSunDirection` / `bloxdSeconds`、`bloxdWorldPosition`、デフォルトフック群、`BLOXD_*` マクロ行列、8 バリアント行列 — は v3 から不変であり、§42 の blockFlags 名前分類規則もそのまま引き継がれる。

| v3 | v4 | 備考 |
|---|---|---|
| `l.fogVisibility` | `l.fogAlpha` | **意味が反転** — 単なる改名ではなく式の移植が必要 |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` | 本体は同一: `vec3i(floor(pos - nrm * 0.5)) + bloxdRenderOffset()` |
| `behind.found` | `behind.hit` | `BloxdOpaqueBehind` のフィールド改名 |
| ヘッダ 1 行目 | — | `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` → `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` |

### 59.1 `fogVisibility` → `fogAlpha`: 反転する改名

v3: `fogVisibility: f32, // 1 = no fog, 0 = fully fogged.` v4: `fogAlpha: f32, // 0 = no fog, 1 = only fogColour.` デフォルトのフォグ適用も一緒に反転した:

```wgsl
// v3
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}
// v4
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

移植表 — v3 のフォグイディオムにはすべて機械的な v4 版がある:

| v3 の式 | v4 への移植 |
|---|---|
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, l.fogVisibility)` | `mix(col, l.fogColour, l.fogAlpha)` (または `bloxdApplyFog(col, l)`) |
| `mix(l.fogColour, col, max(l.fogVisibility, 0.15))` (フォグ下限) | `mix(col, l.fogColour, min(l.fogAlpha, 0.85))` |
| 「近距離では fogVisibility は 1」 | 「近距離では fogAlpha は 0」 |

フォグの*距離*挙動は不変 — 同じ曲線、同じ色。移動したのはフィールドの極性と名前だけ。`fogColour` のコメントも変わっている点に注意: v3 は「ゲームには常にフォグがある」としていたが、v4 は `0 when the game has no fog` と文書化する (そしてシーンのフォグがオフのときエンジンは実際に `vec3f(0.0)` を流す) — `fogColour` で割ったり比較したりするパックには関係する。

### 59.2 `bloxdFaceBlock` → `bloxdFragmentBlockPosition`

純粋な改名である — エンジン自身のドキュメントコメントが「the face ... belongs to のワールドブロック」から「ブロックのワールド位置を特定する」に変わり、本体はバイト同一、パラメータ名は従来どおり自由。レシピ R4 およびすべての `bloxdFaceBlock(l.position, l.normal)` 呼び出し箇所は置換で移植できる。

### 59.3 `found` → `hit`

`bloxdOpaqueBehind()` は `BloxdOpaqueBehind` を返すまま、`BLOXD_SCENE_DEPTH` が定義される場所 (リキッドプログラム、§60.4) だけでコンパイルされるまま、フィールド名以外の実装は不変。`behind.found` → `behind.hit` に移植し、v4 ヘッダのコメントから意味を読み直すこと: `!hit` のとき `position` と `distance` は「無意味」ではなく `0` である。R-E (水の吸収) 系は機械的に移植できる。

## 60. strict ゲームとの契約: バーテックスフック、`discard`、X線

strict ゲームは例外ではなく原則である: **すべてのゲームの既定は strict** で、§30 が列挙する 12 の allow タイトルだけが除外される (v4 バンドルで 2026-10-27 に再検証 — 同じ 12 タイトル: Test Gym、Doodle Cube、Rocket Obby、Creative、Bloxd Hop、Fishing、Dress Up、Evil Tower、Plots、Test Mode、Tsunami Steal Brainrots、Work at a Restaurant。それ以外の全タイトル — サバイバル、bedwars、skywars、カスタムゲーム等々 — は strict)。v4 は、これまで文書レベルの契約だったものを**強制**に変えた: バンドル内バリデータがすべての strict バリアントを解析し、専用診断を出す。

### 60.1 強制される 2 つの規則とその正確な診断

> `bloxdTerrainVertex moves terrain, which strict games prevent.`
>
> `discard makes terrain see-through, which strict games prevent.`

仕組み (バリデータから復元):

- **strict バリアントでバーテックスフックが定義されている** (つまり `#ifndef BLOXD_STRICT` で包んでいない) と最初のメッセージが出る。「terrain を動かす」は文字通りに取られる: デフォルト通りの正確なパススルーでないバーテックスフックはすべて該当する (判定は `movesVertices = vertexHook && !isExactDefault` — 入力をそのまま返すフックでも、別の綴りを通すだけで移動とみなされる)。
- **サーフェス/light フックから到達可能な `discard`** は 2 番目を出す。`discard` 自体は v4 で非 strict ゲーム向けに*新しく合法化*された — v1〜v3 の全面禁止はなくなった — が、strict ゲームはこれを X 線とみなす (下記)。
- **1 回の違反で strict ゲームではすべて無効になる。** strict バリアントの解析がこの種の診断を 1 つでも出すと、バリデータは strict バリアントの*3 つのフックすべて*を null 化する: パックはロードされ続け、allow ゲームで動き続け、strict ゲームでは何もしなくなる。したがってガードされていないバーテックスフックは草の揺れだけでなく、ライティングまで失う。
- **ガードされたコードは残りを生かす。** テンプレートの `#ifndef BLOXD_STRICT` 包みを使うと、strict バリアントはバーテックスフックを定義せず、診断を出さず、サーフェス/light フックは strict ゲームでも動き続ける。テンプレートのコメント *"so our pack can stay on"* の意味はまさにこれである。

設定 UI が作者をまさにこの手順へ誘導する。ステータス行をそのまま引用する:

> `Off in strict games. To run any other parts of the pack in them, wrap each one listed below in #ifndef BLOXD_STRICT ... #endif`

…続いて違反フックの一覧が表示され、各項目には `strict / non-strict`、`lighting on / off`、`terrain / liquid` と綴られたバリアント軸つきの `(only in {{variants}})` が付くことがある。そしてゲーム内では、現在のモードで実行するものが何も残っていないパックに向けてチャットが `Your shader pack is off in this game.` を表示する。

### 60.2 理由: X線

2 つの規則は同じ理由で存在する — 競技系ゲームでは、地形を動かしたり穴を開けたりするシェーダが埋没した構造物と鉱石を曝露しうるからである: 遮蔽ブロックを横に引き剥がすバーテックスフックはウォールハックであり、選択されたフラグメントでの `discard` はピンホール X 線である。エンジン自身のテンプレートが*バーテックスフックだけ*をガードする理由もこれ: サーフェス/light の効果 (色、ライティング、emission) はジオメトリを動かせないため、どこでも安全である。コミュニティのチュートリアルチャンネルはこの方針をプレイヤー側からも裏付けている — 草揺れパックは「strict ゲームでは効かない」代表例であり、strict ゲームが行うアンチ X 線の刈り取りは一部のテクスチャをレンダリング経路から完全に隠すため、テクセル読み取りまで白で返ってくることがある。strict ファーストで設計すること: allow ゲーム限定の効果 (揺れ、穴) は漸進的強化として扱い、決して目玉機能にしない。

### 60.3 v4 に*入っていない*もの: シャドウ API

同じコミュニティチャンネルには、エンジン作者がシャドウ API の草案 (`bloxd-api` の仲間ファイル) を持っているが今回のリリースには**入れていない**、という記録がある。ブロック/草のシャドウは将来のシェーダーパック API 更新とともに届く見込み。v4 バンドルにはシャドウ関連が何も存在しない (シャドウシンボルなし、§63.4 のリスト以外の予約名なし) — シャドウは「発表済み・未搭載」と扱い、まだこれに依存する配布パックを作らないこと。`skyLight` ベースの投影シャドウ レシピ (R9.12) は v4 で唯一入手可能なシャドウ表現のままである。

### 60.4 リキッド作者向け strict のまとめ

マクロ行列は §46 から不変: `BLOXD_ALPHA` はすべてのリキッドバリアントと非 strict の terrain で、`BLOXD_SCENE_DEPTH` はすべてのリキッドバリアントで、`BLOXD_STRICT` / `BLOXD_LIGHTING` はそれぞれの軸で定義される。strict リキッドプログラムでも alpha と depth は使える — strict でゲートされるのは terrain の alpha だけである。

## 61. v3 → v4 移行チェックリスト

1. **`pack.json`**: `"apiVersion": 4` — 数値であって文字列ではない。
2. **改名** `bloxdFaceBlock` → `bloxdFragmentBlockPosition` を全面的に (引数は不変、パラメータ名は従来どおり自由)。
3. **フォグの移植** (静かな罠 — これを飛ばしたパックはコンパイルが通って見た目がおかしくなる):
   - 読み取り `l.fogVisibility` はすべて `1.0 - l.fogAlpha` へ
   - 手書きの `mix(l.fogColour, col, VIS)` はすべて `mix(col, l.fogColour, ALPHA)` へ — さらに良くするなら `bloxdApplyFog(col, l)` に置き換えて式をエンジンに任せる
   - 下限/上限のイディオムはフィールドと一緒に反転する: `max(VIS, 0.15)` → `min(ALPHA, 0.85)`
4. **深度レシピの移植**: `behind.found` → `behind.hit`。`!hit` のとき `position` / `distance` は `0`。
5. *(任意)* **テクスチャ API の採用**: `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` と 4 つの新フィールド (§57〜§58)。回転の繊細さ (57.4) と、テクセルコードが `textureId == 0` を許容しなければならない点を忘れずに。
6. **strict 監査** (配布には必須): すべてのバーテックスフックを `#ifndef BLOXD_STRICT ... #endif` で包む。`discard` を使うなら同じように包むか、strict ゲームでパック全体のフックが無効になることを受け入れる。
7. **実機コンパイル確認**を 8 バリアント横断で: ローダ画面の "Checking the pack..." が全バリアントを一度に検証する — strict/非 strict × lighting on/off × terrain/liquid — だから 1 パスで足りる。その後 allow ゲーム 1 個 (Test Mode が最速) と strict ゲーム 1 個を目視確認する。
8. **自分のバージョンメタデータを上げて**再配布する: プレイヤーのマシンに保存された v3 は静かに非アクティブであり (§55)、理由を説明するのは設定タブだけである。

### 61.1 完全な v3 → v4 移植、前後

```wgsl
// ---- v3 パック: 熱い砂のゆらぎ + フォグ考慮 emission ----
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    if ((s.blockFlags & bloxdBlockFlagSand) != 0u) {
        let p = bloxdWorldPosition(s.position);
        out.colour *= 1.0 + 0.04 * sin(p.x * 7.0 + bloxdSeconds() * 2.0);
    }
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // v3: emission をフォグ後に足して遠距離でも光らせる
    let col = mix(l.fogColour, out.colour, l.fogVisibility);
    out.colour = col + s.emission * l.fogVisibility;
    return out;
}
```

```wgsl
// ---- v4 移植: 同じ見た目 + テクセル対応の砂とテクスチャガード ----
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagSand) != 0u) {
        let p = bloxdWorldPosition(surface.position);
        out.colour *= 1.0 + 0.04 * sin(p.x * 7.0 + bloxdSeconds() * 2.0);
    }
    // v4 追加分: 本物のテクスチャ知識 — 近い面の細かい粒を暗くする
    if (surface.textureId != 0u && surface.mipLevel < 1.0) {
        let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        let grain = abs(dot(t.rgb, vec3f(0.33)) - 0.5);
        out.colour *= 1.0 - 0.08 * grain;
    }
    return out;
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    // v4: fogAlpha 移植 — emission はフォグ後に加算し、(1 - fogAlpha) でゲート
    let col = mix(out.colour, light.fogColour, light.fogAlpha);
    out.colour = col + surface.emission * (1.0 - light.fogAlpha);
    return out;
}
```

どちらのフックも surface/light のみなので、このパックに `#ifndef BLOXD_STRICT` 包みは不要で、strict ゲームでも (新しいテクセル効果つきで) 動く。`textureId != 0u` ガードがテクスチャなしの面をカバーし、strict ゲームのアンチ X 線については、id が非ゼロでもテクセルが白で返ってくる場合に備えてスタイル効果は緩やかに劣化する設計にする — 期待される単一のテクセル値で分岐せず、範囲と比率で分岐すること。

## 62. その他の v4 変更と注意

- **バンドル再編** (導入部の数値) により、シェーダーパイプラインは c49 (ローダ/永続化)、c50〜c51 (ローダ UI + zip)、c53 (バリデータ + ヘッダ + レジストリ構築)、c54 (WGSL コード生成器 + Lite レンダラ) へ移動した。v3 時代のガイドの後にバンドルを再調査する人へ: アンカーは全部移動したが、コードは移動していない。
- **ヘッダテキストは明確さのために書き直された** — すべてのドキュメントコメントが言い換えられ (より簡潔に)、§59 以外の意味変化はない。サイズ 5,637 → 6,021 バイト、128 → 150 行。1 行目は `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.`
- **emission の順序がヘッダ内で公式文書化された**: `emission: vec3f, // Emissive RGB output, added after lighting, before fog.` — v3 の §43 の発見が公式の文言になった。
- シェーダーパック機能の **i18n 表面は 58 キー** (v4 ビルド)。ローダ系 (`load*`) は §55〜§56、ステータス系 (`status*`) は §55、バリアントラベルは §60.1 で引用済み。
- **リファレンス資材の内蔵** (導入部): エンジンのエラーメッセージは `bloxd-api.wgsl` と `BLOCK_TEXTURES.md` を引用する。本ガイドは引用ではなく中身を同梱する — 完全復元ヘッダ (§67) と完全実測カタログ (§68) — ので、パックの作成・デバッグに外部ファイルは不要である。
- **テクスチャレジストリ変化でも自動再チェックが発動する** (§65.1) — レジストリハッシュが HEADER_VERSION に加わった結果。ヘッダテキストが変わらなくても、テクスチャを*追加しただけ*のエンジン更新後に保存パックが「要再チェック」に切り替わりうる。これは意図的な設計である: `bloxdTextureId*` 定数は検証時に焼き固められるから。
- **`bloxdSp*` 予約は 27 シンボルに拡大** (§63.4) — 生成シェーダ内のエンジン私有名前空間。パックレベルの予約規則は不変かつより広い: `/^bloxd/i` (大小文字非感受) に一致するすべて。

## 63. エンジン内部: `bloxdTexel` が実際にサンプリングする仕組み

v3 に対する §49〜§51 と同様、以下は本番バンドル (チャンク c54 のコード生成器、ビルド `cnty9`、2026-10-26) から逐語復元したものであり、この機構の最深の公開記述である。§57 の内容はこれらの断片が証明するものを超えていない。

### 63.1 生成される関数、逐語

アトラス方式でアニメーションなしのレンダラ構成では、エンジンは正確に以下を出力する:

```wgsl
var<private> bloxdSpTextureRotation: u32;
@group(3) @binding(2) var<storage, read> bloxdSpTextureLayers: array<u32>;

fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
    return textureDimensions(textureAtlas0,
        u32(clamp(round(bloxdSpMipLevel), 0.0,
                  f32(textureNumLevels(textureAtlas0) - 1u))));
}

fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
    if (bloxdSpTextureId == 0u) {
        return vec4f(1.0);
    }
    // Each quarter turn clockwise the face shows its texture at reads the
    // unturned texture at (v, 1 - u)
    var bloxdSpTurned = bloxdSpUv;
    if (bloxdSpTextureRotation == 1u) {
        bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
    } else if (bloxdSpTextureRotation == 2u) {
        bloxdSpTurned = 1.0 - bloxdSpUv;
    } else if (bloxdSpTextureRotation == 3u) {
        bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
    }
    let bloxdSpLayer = bloxdSpTextureId - 1u;
    return textureSampleLevel(textureAtlas0, atlasSampler, bloxdSpTurned,
                              bloxdSpLayer, round(bloxdSpMipLevel));
}
```

アトラスが複数あると末尾はレイヤ窓のはしごになる — アトラス *k* はレイヤ `[k * layersPerAtlas, (k+1) * layersPerAtlas)` を所有する:

```wgsl
    if (bloxdSpLayer < 2u * layersPerAtlas) {
        return textureSampleLevel(textureAtlas1, atlasSampler, bloxdSpTurned,
                                  bloxdSpLayer - layersPerAtlas, round(bloxdSpMipLevel));
    }
    // ... アトラス毎に 1 段、最後だけ無条件 ...
    return textureSampleLevel(textureAtlasLast, atlasSampler, bloxdSpTurned,
                              bloxdSpLayer - N * layersPerAtlas, round(bloxdSpMipLevel));
```

これが証明するもの: `textureId` は**全アトラス横断のグローバル 1 起点レイヤ番号**であり (`bloxdSpLayer = textureId - 1u`)、`bloxdTextureSize` はアトラス 0 だけを読む — 全アトラス階層が同じ寸法を共有するため有効である。

### 63.2 フラグメントのテクスチャ 4 つ組の由来

バーテックス属性 `texAtlasIndices` (ジオメトリのテクスチャスロット番号) は、直接使われず**ストレージバッファ経由で**解決される:

```wgsl
// バーテックス段 (注入):
vertexOutputs.vPackTexture = bloxdSpTextureLayers[
    min(u32(vertexInputs.texAtlasIndices), arrayLength(&bloxdSpTextureLayers) - 1u)];
```

`bloxdSpTextureLayers` は JS 側でスロット毎に 1 つの `u32` として埋められ、正確に次のようにパックされる:

```js
layers[slot] = (id & 0xffff) | ((rotation & 3) << 16);
```

フラグメント段はサーフェスフックの前に両半分を取り出す:

```wgsl
// フラグメント段 (注入、サーフェスフックの直前):
let bloxdSpTexture = fragmentInputs.vPackTexture;
bloxdSpTextureRotation = bloxdSpTexture >> 16u;      // -> textureRotation フィールド
// BloxdSurfaceIn コンストラクタ末尾:
//   bloxdSpTexture & 0xffffu,        // textureId
//   bloxdSpTextureRotation,          // textureRotation
//   fragmentInputs.vMainUV1,         // uv
//   bloxdSpMipLevel                  // mipLevel (下記で導出)
```

mip はエンジン自身の導出と完全に同じ式で導かれる:

```wgsl
let bloxdSpTexelUV = fragmentInputs.vMainUV1 * atlasWidth;
let bloxdSpDdx = dpdx(bloxdSpTexelUV);
let bloxdSpDdy = dpdy(bloxdSpTexelUV);
let bloxdSpLod = 0.5 * log2(max(max(dot(bloxdSpDdx, bloxdSpDdx),
                                    dot(bloxdSpDdy, bloxdSpDdy)), 1e-10));
let bloxdSpMipLevel = clamp(bloxdSpLod, 0.0,
                            f32(textureNumLevels(textureAtlas0) - 1u));
```

肝に銘じるべき帰結が 2 つ: 回転は本当に**スロット毎のジオメトリデータ**である (テクスチャ毎の回転ルックアップはどこにもない — これが§57.4 の繊細さが存在する*理由*である)。そして (パックなしの) *デフォルト*地形シェーダはアトラスを別の方法でサンプリングする — 事前回転済みレイヤコピーを生 uv で直接読む。パック経路は回転していないレイヤに正規化し、`bloxdTexel` 内で回転を再適用する。同じピクセル、2 つの表現である。

### 63.3 アニメーション: フレームのはしご

アニメーション対象テクスチャではレイヤ割り当てにフレーム計算が加わる (これが*唯一*の違い — サンプリング、回転、mip のロジックは不変):

```wgsl
    let atlasIdxIn = f32(bloxdSpTextureId - 1u);
    let animTick = material.anim.x;               // アニメーションクロック
    let animTickStride = material.anim.y;
    let numAnimTextures = material.anim.z;
    let animParamIndex = 3.0 * min(numAnimTextures, floor(atlasIdxIn));
    let animStateMask = animDataPerTex[i32(animParamIndex)];        // フレーム数 - 1
    let animTexIndexStart = animDataPerTex[i32(animParamIndex + 1.0)];
    let animInterval = max(animTickStride, animDataPerTex[i32(animParamIndex + 2.0)]);
    let animTickForTex = floor((animTickStride / animInterval) * animTick);
    let animState = animTickForTex
        - (animStateMask + 1.0) * floor(animTickForTex / (animStateMask + 1.0));
    let isAnimTex = min(1.0, animState);
    let bloxdSpFrame = (1.0 - isAnimTex) * atlasIdxIn
                     + isAnimTex * (animTexIndexStart + animState - 1.0);
    let bloxdSpLayer = u32(round(bloxdSpFrame));
```

`animDataPerTex` (group 2、`array<f32>`) はアニメーションテクスチャ毎に `{mask, startLayer, interval}` の三つ組を運ぶ。フレーム数は**2 の冪が要求**される (JS 側のビルドチェックが 2 冪でないフレーム数を `<block> has N animation states, which is not a power of 2` で拒否する)。静的センチネル設計により、非アニメーションの番号も同じ数式で分岐なしに解決される。パック向けの要約をもう一度: *id は安定、フレームは自動。*

### 63.4 `bloxdSp*` 名前空間 — 27 シンボルの全容

生成器がシェーダに注入しうるもの、すなわち再宣言できないものすべて (パックレベルの `/^bloxd/i` 予約がほとんどを無用にするが、エンジンソース読者向けに v4 の完全な集合を生成器テンプレートから抽出する):

`bloxdSpBehind` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpEye` · `bloxdSpFrame` · `bloxdSpLayer` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLitColour` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpPixel` · `bloxdSpPositionW` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpZ`

### 63.5 バインドグループの全レイアウト (Lite レンダラ、パック付き)

| グループ | binding | リソース | 備考 |
|---|---|---|---|
| 0 | 0 | `uniform` scene | `LiteSceneUniforms` — viewProjection / view / vEyePosition |
| 1 | 2〜3 | `storage` quads, quadLight | チャンクジオメトリ |
| 2 | 0 | `uniform` material | `TerrainMaterialUniforms`。`anim` が §63.3 を駆動 |
| 2 | 1+ | `storage` `animDataPerTex` | アニメーテッドテクスチャの三つ組 (アニメーション構成のみ) |
| 2 | next | `textureAtlas0..N-1` | `texture_2d_array<f32>`、テクスチャ毎に 1 レイヤ |
| 2 | next | `sampler atlasSampler` | `bloxdTexel` が使う唯一のサンプラ |
| 3 | 0 | `uniform bloxdPackInputs` | パックの 64 B フレーム毎 uniform (§56) |
| 3 | 1 | `texture_2d<f32>` scene depth | リキッドプログラム。`bloxdOpaqueBehind()` の実体 (§51) |
| 3 | 2 | `storage bloxdSpTextureLayers` | id+回転のテーブル (§63.2) |

group 3 がパックのグループである: エンジン提供の 3 スロット、どれもパックコードからは名指しできない。

## 64. テクスチャ名レジストリ

エンジンはブロックレジストリから名前カタログをセッション毎に 1 回構築する — テクスチャパック機構の `textureNameToIndex` を生み出したのと同じパイプラインである。構築器 (バンドル内モジュール 28833) を擬似コードで復元する:

```
textureNameToIndex の各 (name, index) について:      # 例: ("lava0", 0), ("radar_screen0[rot[2", 19)
    name が /(.*)\[rot\[([1-4])$/ に一致:            # 回転コピースロット
        回転スロット → { id: ルートの非回転id, rotation: N-1 }   # §63.2 のテーブル項目
        エイリアス登録: name → ルート, 種別 "rotation"
    そうでなく index がアニメーションフレーム (基底以外):  # animDataPerTex 経由で判定
        エイリアス登録: name → 基底, 種別 "frame"
    それ以外:
        正規名 = このテクスチャがアニメーションなら末尾の "_?0" を除去
        named[正規名] = index + 1                     # bloxdTextureId* の値
```

作者にとって重要な規則を重複なく挙げる:

1. **利用可能な名前は正規名**: アニメーション基底はフレーム接尾辞を落とし (`lava0` → `lava`)、回転族はルートに畳み込み (`chest_top[rot[1..4]` → `chest_top`)、両者の畳み込みは合成される (`radar_screen0[rot[1..4]` → `radar_screen` — この族はアニメーションでもあるため)。それ以外のファイル名はそのまま。定数の綴りはその正規名を CamelCase 化する (§57.3)。
2. **フレームと回転のエイリアスは既知でエラー説明つき** — 使っても「did you mean」の当て推量ではなく、専用のフレーム/回転メッセージが返る (§57.3)。意図的な API 設計である: `bloxdTexel` がアニメーションも回転も代行するため、フレームや回転コピーを直接指定するのは常に間違いである。
3. **曖昧さは名前を殺す**: 大小文字・アンダースコア非感受の同じ鍵へ畳み込まれる 2 つの名前はどちらも使えない (`could name X and Y ... it can't be use`)。稀だが実在する — 期待した名前が §68 のカタログにないなら、これが理由の 1 つである。
4. **id は 1 起点で「アトラスレイヤ + 1」に等しい**。テクスチャなしの id 0 は白として予約済み。

ライブレジストリの実測 (ビルド `cnty9`、2026-10-27、エンジン自身の構築モジュールを同梱データ上で実行して測定): **1,219 のアトラスエントリ**が**57 の回転族** (回転綴り 228 個) と**42 のアニメーション族** (フレーム綴り 188 個) を畳み込み、**905 の利用可能な名前付き定数**を残す — 名前ごとの id と両族の表を含む完全なリストは §68 (第十一部) として組み込んである。§65.1 のレジストリハッシュ機構が、これらの数の drift に合わせて焼き済み `bloxdTextureId*` の値が黙って古くなるのを防いでいる。

## 65. 検証の内部仕様 v4: HEADER_VERSION、レジストリハッシュ、特殊関数

### 65.1 HEADER_VERSION に 2 つ目のハッシュが加わる

v3 の形式は 5 入力に対する `6.<fnv1a32>` だった (§53)。v4 は同じ 5 入力 — バリアント毎のヘッダトークン、パーサの語彙宇宙、4 つのマクロ名、特殊関数マップ、`BloxdPackInputs` 宣言 — を維持したまま、接頭辞を `8.` に移し、**テクスチャレジストリ全体の `"<name> <id>"` ソート済みリストに対する 2 番目の FNV-1a-32 を追加**する:

```
v2 (sjr0p7):   6.bc5e8338
v3 (3ymzdd):   6.5bc26a63
v4 (cnty9):    8.<header-hash>.<registry-hash>     ← 形式をバンドルから復元
```

(v4 の具体的なハッシュ値は本ガイドでは未計測 — 実行時計算のため — だが形式は正確であり、上の v2/v3 の値は従来公表済みの計測である。エンジン更新後のパック設定画面に現在値が表示される。)

重要なのは帰結の方である: **保存パックの検証結果は、テクスチャレジストリが変化したときにも無効化される** — エンジンがテクスチャを追加・改名・再配置したとき — なぜなら `bloxdTextureId*` の比較は古いレジストリに対して解決されていたからである。v3 がヘッダ編集で発動していた「要再チェック」の流れに、2 番目のコンテンツ駆動トリガーが加わった。作者はこれに対応する必要はない (エンジンが自動再検証する)。配布者は単にこれを予期しておけばよい。

### 65.2 予約名を改めて正確に

規則は正規表現 `/^bloxd/i` — **大小文字非感受**なので `BloxdFoo` は `bloxdFoo` と同じく予約であり、`bloxdTextureIdAnything` は何も名指ししていなくてもこの下に入る (だから §57.3 の綴り間違い診断が独立したメッセージファミリーとして存在する)。§63.4 の 27 シンボルの `bloxdSp*` が、生成コード内側でのエンジン側の対応物である。

### 65.3 特殊関数: 3 つに

バリデータの特殊関数レジストリは v3 の 1 項目から 3 項目になった — テクスチャ API の 2 関数が深度の隣に登録された:

```js
[
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel",        { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize",  { params: "mipLevel: f32", returns: "vec2u", symbol: null }]
]
```

`symbol: null` は「バリアントゲートなし」— 関数が存在する場所 (surface/light フック) ならどこでも呼べる。2 つの "reaches" 診断はそのまま引き継がれ、テクスチャの誤用もカバーするようになった:

> `${hook} reaches ${name}, which only surface and light hooks can use.` — 例: バーテックスフックからの `bloxdTexel`。
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — 例: ラップなしの terrain フックからの `bloxdOpaqueBehind()` (v3 §53 から不変)。

### 65.4 v3 §53 からそのまま引き継がれるもの

フックシグネチャ検査 (型はトークン厳密、名前は自由 — 3 つのシグネチャ項目は v3 とバイト同一)、`pack_` 接頭辞リネームと診断の逆マッピング、未宣言識別子のメッセージファミリー、パーサの拡張語彙宇宙 (`bufferView` / `bufferArrayView` / `bufferLength` / `atomicStoreMax` / `atomicStoreMin` — 引き続きブラウザでの提供は保証されない)、2 段階検証 (内蔵パーサ → ブラウザの WGSL コンパイラ。後者の方が引き続き厳格で、§38 の教訓は有効)。

## 66. 確認された定数・制限・レイアウト (v4)

本ガイドの計測台帳の v4 行 — 特に日付が付いていない項目はすべて `cnty9` (2026-10-26、本番 = preprod、バイト同一) で計測した:

| 項目 | 値 |
|---|---|
| `apiVersion` | `4` (厳密 `===`、数値) |
| エンジンヘッダ | 6,021 B / 150 行。1 行目 `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` — 全文は §67 に組み込み済み |
| フック | 6 個 (terrain/liquid × vertex/surface/light)。テンプレートはコメント整形のみ |
| バリアント | 8 個 (strict × lighting × program)。名前は `strict\|allow.lit\|unlit.terrain\|liquid` |
| マクロ | `BLOXD_STRICT` (strict) · `BLOXD_LIGHTING` (lit) · `BLOXD_ALPHA` (全リキッド + 非 strict terrain) · `BLOXD_SCENE_DEPTH` (全リキッド) |
| パック uniform | `@group(3) @binding(0)`、64 B: seconds@0, renderOffset@16, sunDirection@32, eyePosition@48 |
| パック binding | group 3: 0 uniform · 1 scene depth (リキッド) · 2 `bloxdSpTextureLayers` storage |
| blockFlags ビット | opaque 1 · emissive 2 · vegetation 4 · dirt 8 · sand 16 · rock 32 (不変、§42 の名前規則も引き継ぎ) |
| ローダ制限 | 256 `.wgsl` / 256 KB ソース / 64 KB `pack.json` / 32 MB zip / 1,024 zip エントリ。UTF-8。manifest は 1 個。重複パス不可 |
| テクスチャレジストリ | 1,219 エントリ (2026-10-27 実測、ビルド `cnty9`) → 905 の利用可能な名前。完全カタログ: §68 (第十一部) |
| ライト曲線 | 0〜15 レベル → 0〜1 のイーズアウト (`6 → 0.45`、`12 → 0.92`) — ヘッダ内、不変 |
| リフト曲線 | `1 - (1 - x / (3 - 2x))^3` — 不変、現在はチャンク c8 |
| ディレクショナルコーン | `0.12 / 0.65 / 0.62 / 0.95` — 不変、現在はチャンク c8 |
| フォグ色 | `vec3f(183/255, 191/255, 195/255)` — 不変。v4 のフィールド名は `fogAlpha` (§59.1) |
| 予約名 | `/^bloxd/i` (大小文字非感受) + エンジン側 27 個の `bloxdSp*` |
| HEADER_VERSION | `8.<fnv1a32(ヘッダ)>.<fnv1a32(テクスチャレジストリ)>` |
| strict タイトル | §30 の 12 allow タイトル以外のすべて (2026-10-27 再検証、不変) |


---

[← 前の部](10-apiv4.md)・[マニュアルに戻る](README.md)

# 第十一部: 完全リファレンス — エンジンヘッダとテクスチャカタログ

対象ビルド: `cnty9.main.669f8081.js` (2026-10-27 実測、本番と preprod はバイト同一)。本部は 2 つのリファレンス資材を**丸ごと**掲載し、ガイドを自己完結させる — このリポジトリの外にあるものは何も不要になる。§67 はエンジンヘッダの正確なテキストそのものであり、ローダが WGSL の前に付ける定数・関数・構造体のすべてである (本番バンドルから逐語復元)。§68 はテクスチャ名カタログの完全版: 実測 id 付きの使用可能 905 名、回転族 57、アニメ族 42、そして「名前で書け、生 id を書くな」の根拠となるレジストリ drift の実測である。

このカタログは畳み込み規則から再導出した近似ではない。エンジン**自身**のレジストリ構築モジュール (module 28833 — 検証時の `bloxdTextureId*` 参照を解決するのと同じコード) を稼働ビルド同梱の `textureNameToIndex` と `animDataPerTex` データの上で実行し、その出力を記録したものである。したがって以下の id はすべて現在の稼働エンジンが解決する正確な値であり、エイリアスの挙動 (フレーム畳み込み・回転畳み込み・専用エラーになる綴り) も本ガイドの解釈ではなく構築器自身の分類である。

2 つの資材はビルドとともに別々の速さで動く。ヘッダテキストが変わるのはエンジンチームが API 変更を出荷したときだけだ (v4 では第二のレジストリハッシュと 4 つの入力フィールドが増えた、§65.1)。一方テクスチャレジストリは**コンテンツ**であり、ブロックの追加・再テクスチャのたびに動く — 10 月だけで、98 エントリ追加・79 削除、綴りが変わらなかった 1,121 名中 779 名の id 変更が起きた (§68.5)。将来のビルド更新後は本部と同じ手順で再計測すればよい。以下に示す構造こそが安定した部分である。

## 67. v4 エンジンヘッダ全文 (逐語)

これが `cnty9` に同梱されたままの、全パックの前に付与される 6,021 バイト・150 行のヘッダである — 先頭行が `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` から始まる、§66 の計測対象と同一テキスト。パック作者が「エンジンが自分の代わりに何を宣言しているのか」を推測せずに済むよう全文を掲載する: 呼び出せる全自由関数、比較できる全 `const`、コメント付きの全フィールドを持つ両入力構造体が、エンジン内の出現順のまま並んでいる。

このテキストに**含まれない**ものが 2 つある。`bloxdTexel` / `bloxdTextureSize` のペア (§63.1 に生成 WGSL 全文) と 27 個の `bloxdSp*` シンボル (§63.4) である — いずれもパックごとではなくレンダラ構成ごとにコンパイル時に生成されるため、逐語ヘッダには最初から入らない。`BloxdSurface` と `bloxdDefaultSurface` に見える `#ifdef BLOXD_ALPHA` ゲートはエンジン自身のプリプロセッサがバリアントごとに解決する — 正規テキストはゲートを保ったままで、どのバリアントが定義するかは §59.1/§56 にある。

```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. テクスチャカタログ完全版 (905 名、実測)

### 68.1 読み方

**名前**列がレジストリ名 — 実際に書くハンドルである。定数の綴りは §57.3 の通り `_` と `-` の境界で CamelCase 化する: `grass_top` → `bloxdTextureIdGrassTop`、`lava` → `bloxdTextureIdLava`、`chest_double_top_1_lo` → `bloxdTextureIdChestDoubleTop1Lo`。名前こそ API であり、ローダが読み込み時に生レジストリへ再解決するため、レジストリの drift を生き延びる。

**id** 列はその定数が比較対象とする値 — アトラス層 + 1 の `cnty9` 実測値。`surface.textureId` のダンプ解読やデバッグ出力の確認、不調なパックと当日ビルドの突き合わせに使う。WGSL に直接書き込んではならない — これは 1 ビルドのアトラス順序のスナップショットであり、どれだけ速く動くかは §68.5 の通り。

**備考**列は 2 つの畳み込み族を示す。「アニメ (Nフレーム)」はこの名前をサンプルすると現在のアニメーションフレームが自動で返る意味 — フレーム接尾辞を書いてはならない (`lava0`、`radar_screen2` は専用診断の出る既知エイリアス)。「回転族 (4コピー)」はテクスチャが事前回転スロットとしてのみ存在する意味 — 名前は root を指し、`bloxdTexel` が回転を再適用する (§57.4)。両方の備考を持つ名前は 1 つだけ (`radar_screen`) である。

意図的に**載せない**もの: 残りの 416 個のレジストリ綴り — フレームエイリアス 188 個と回転エイリアス 228 個 — は使用可能な定数ではなく、書こうとするとエンジンがそれぞれ専用のエラーメッセージで説明する (§57.3)。背後にある 1,219 行のレイヤ表 (事前回転 171 スロットを含む) はエンジン内部のもので §63.2/§63.4 で扱っている。

### 68.2 カタログ本体

使用可能な全名前をアルファベット順に掲載する。id 列は `bloxdTextureId*` の値 — アトラス層 + 1 の実測値 (ビルド `cnty9`、2026-10-27)。**id はスナップショット、名前こそ API として扱うこと**: 本ガイドが計測した 10 月の 2 ビルド間だけでも、改名されなかった 1121 名中 779 名が id を変えた (§68.5)。エンジンは検証時に名前を解決するため、名前で書いたパックはレジストリの drift を生き延びるが、生 id で書いたパックはそうならない。

| 名前 | id (cnty9) | 備考 |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | アニメ (4フレーム) |
| `alloy_kiln_top` | 1087 | 回転族 (4コピー) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | アニメ (4フレーム) |
| `auto_bench_top` | 1102 | 回転族 (4コピー) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | 回転族 (4コピー) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | 回転族 (4コピー) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | 回転族 (4コピー) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | アニメ (4フレーム) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | 回転族 (4コピー) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | 回転族 (4コピー) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | アニメ (4フレーム) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | 回転族 (4コピー) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | 回転族 (4コピー) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | アニメ (4フレーム) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | 回転族 (4コピー) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | アニメ (4フレーム) |
| `burner_drill_top` | 1043 | 回転族 (4コピー) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | 回転族 (4コピー) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | 回転族 (4コピー) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | アニメ (4フレーム) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | アニメ (4フレーム) |
| `crop_harvester_top` | 1188 | 回転族 (4コピー) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | アニメ (4フレーム) |
| `crusher_top` | 1051 | 回転族 (4コピー) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | アニメ (4フレーム) |
| `crystal_vat_top` | 1162 | 回転族 (4コピー) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | 回転族 (4コピー) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | 回転族 (4コピー) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | アニメ (4フレーム) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | 回転族 (4コピー) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | アニメ (4フレーム) |
| `deep_drill_top` | 1135 | 回転族 (4コピー) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | アニメ (4フレーム) |
| `electric_drill_top` | 1094 | 回転族 (4コピー) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | アニメ (4フレーム) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | 回転族 (4コピー) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | アニメ (4フレーム) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | 回転族 (4コピー) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | 回転族 (4コピー) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | アニメ (4フレーム) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | 回転族 (4コピー) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | アニメ (4フレーム) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | アニメ (4フレーム) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | 回転族 (4コピー) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | アニメ (8フレーム) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | 回転族 (4コピー) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | 回転族 (4コピー) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | 回転族 (4コピー) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | 回転族 (4コピー) |
| `lightblue_portal` | 9 | アニメ (4フレーム) |
| `lightgray_portal` | 10 | アニメ (4フレーム) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | 回転族 (4コピー) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | アニメ (4フレーム) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | 回転族 (4コピー) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | 回転族 (4コピー) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | アニメ (4フレーム) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | 回転族 (4コピー) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | 回転族 (4コピー) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | 回転族 (4コピー) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | アニメ (4フレーム) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | 回転族 (4コピー) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | 回転族 (4コピー) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | アニメ (4フレーム) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | 回転族 (4コピー) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | アニメ (4フレーム) |
| `press_top` | 1067 | 回転族 (4コピー) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | 回転族 (4コピー) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | アニメ (4フレーム) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | 回転族 (4コピー) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | アニメ (4フレーム)・回転族 (4コピー) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | アニメ (4フレーム) |
| `recycler_top` | 1177 | 回転族 (4コピー) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | 回転族 (4コピー) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | アニメ (4フレーム) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | 回転族 (4コピー) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | アニメ (4フレーム) |
| `shatter_mill_top` | 1143 | 回転族 (4コピー) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | 回転族 (4コピー) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | 回転族 (4コピー) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | アニメ (4フレーム) |
| `sky_tap_top` | 1150 | 回転族 (4コピー) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | アニメ (4フレーム) |
| `smelter_top` | 1058 | 回転族 (4コピー) |
| `smoke` | 23 | アニメ (4フレーム) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | アニメ (8フレーム) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | アニメ (4フレーム) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | アニメ (4フレーム) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | アニメ (4フレーム) |
| `tree_cutter_top` | 1125 | 回転族 (4コピー) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | アニメ (4フレーム) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | 回転族 (4コピー) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | アニメ (4フレーム) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | 回転族 (4コピー) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | アニメ (4フレーム) |
| `wire_mill_top` | 1074 | 回転族 (4コピー) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | 回転族 (4コピー) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | アニメ (4フレーム) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | 回転族 (4コピー) |

### 68.3 回転族 (57 root)

これらのテクスチャは事前回転コピー (`name[rot[1..4`) としてのみ存在する。レジストリは以下の root へ畳み込み、`bloxdTexel` がサンプル時に回転を再適用する (§57.4) ので、root を参照しコピーは決して参照しない。`[rot[N` 綴りを書くと専用の回転名診断が出る (§57.3)。

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19)・アニメ族でもある
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 アニメ族 (42 名)

これらの名前をサンプルすると現在のアニメーションフレームが自動的に返る (§63.3 のフレームラダー)。エンジンがテクスチャごとに独自の間隔でフレームを進めるため、パック側がフレーム接尾辞を書くことはない (`lava0` はエラー、`lava` が名前)。

| 名前 | フレーム数 | レジストリ上のベース |
|---|---|---|
| `lava` | 8 | `lava0` |
| `toxic_waste` | 8 | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | `auto_bench_side_running0` |
| `black_portal` | 4 | `black_portal0` |
| `blue_portal` | 4 | `blue_portal0` |
| `brown_portal` | 4 | `brown_portal0` |
| `burner_drill_side_running` | 4 | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | `cyan_portal0` |
| `deep_drill_side_running` | 4 | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | `electric_drill_side_running0` |
| `generator_side_running` | 4 | `generator_side_running0` |
| `gray_portal` | 4 | `gray_portal0` |
| `green_portal` | 4 | `green_portal0` |
| `grey_portal` | 4 | `grey_portal0` |
| `homestead_core_mid` | 4 | `homestead_core_mid0` |
| `lightblue_portal` | 4 | `lightblue_portal0` |
| `lightgray_portal` | 4 | `lightgray_portal0` |
| `lime_portal` | 4 | `lime_portal0` |
| `magenta_portal` | 4 | `magenta_portal0` |
| `orange_portal` | 4 | `orange_portal0` |
| `pink_portal` | 4 | `pink_portal0` |
| `press_side_running` | 4 | `press_side_running0` |
| `purple_portal` | 4 | `purple_portal0` |
| `radar_screen` | 4 | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | `recycler_side_running0` |
| `red_portal` | 4 | `red_portal0` |
| `shatter_mill_side_running` | 4 | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | `smelter_side_running0` |
| `smoke` | 4 | `smoke0` |
| `toxic_waste_barrel_top` | 4 | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | `volt_engine_side_running0` |
| `white_portal` | 4 | `white_portal0` |
| `wire_mill_side_running` | 4 | `wire_mill_side_running0` |
| `yellow_portal` | 4 | `yellow_portal0` |

### 68.5 レジストリの drift 実測 (sjr0p7 → cnty9)

レジストリはビルド同梱のコンテンツであり、ブロック更新のたびに動く。本ガイドが計測した 2 ビルド (2026-10-17 と 2026-10-27、10 日間) でどれだけ速く動くかが分かる:

- エントリ数: 1200 → 1219 (98 追加、79 削除)
- 綴りが変わらなかった名前 1121 名のうち **779 名が id を変更** (69%)
- 命名規約が月中に移行した: `68` 個の `_rot1..4` 接尾辞名 (例: `chest_top_rot1`) が `[rot[1..4` スロット (例: `chest_top[rot[1`) へ移行し、ダブルチェストのテクスチャ (`chest_double_*`、8 エントリ) が同時に登場した
- 使用可能名は 900 → 905 へ移動し、`HEADER_VERSION` のレジストリハッシュ (§65.1) が id を焼き込んだ全保存パックを再無効化した

最後の点が運用上の教訓である: **`19` ではなく `bloxdTextureIdLava` と書く** — 名前定数は上記の全弾を変わらず生き延びる。ローダが読み込み時に生レジストリへ再解決するからである。

[← 前の部](10-apiv4.md)・[マニュアルに戻る](README.md)

---

調査: ltf_ahel (glm を用いて調査)
