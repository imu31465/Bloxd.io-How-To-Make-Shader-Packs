# Bloxd.io シェーダーパックの作り方 (完全版)

Bloxd.io のシェーダーパック (WebGPU レンダラー専用) を自作・配布するための単独完結の手順書。
`apiVersion: 2` 時点の仕様に基づく。レシピ集と API リファレンスを含むため、この1ファイルだけで最初から配布まで行える。v1 パックは現行ゲームで読み込めない (v1 の `apiVersion` 値・旧識別子は拒否される)。v1 からの移行は第八部を参照。

> 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる。  
> 本書はAIの支援を受けて作成されており、内容の正確性は保証されない。実際のゲーム動作で確認すること。  
> 最終レビュー: 2026-10-15 (フォグ適用順序・フォグ実設定・水中の描画構造をレンダラー実装と照合し更新)。専用の公開公式WGSL APIリファレンスを確認できていないため、API説明とレシピは読み込み画面・実機コンパイルで継続検証すること。  
> シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パックは純粋な WGSL  
> (JS 実行・通信不可) のため、通常の記述で危険なことは起きない。

## 目次

- [第一部: 作り方](#第一部-作り方)
- [第二部: API リファレンス](#第二部-api-リファレンス)
- [第三部: レシピ集](recipes.md)
- [第四部: リアル化ガイド](#第四部-リアル化ガイド)
- [第五部: トラブルシューティング・注意](#第五部-トラブルシューティング注意)
- [第六部: 実装時の重要な補足](#第六部-実装時の重要な補足)
- [第七部: 内部仕様の補足](#第七部-内部仕様の補足)
- [第八部: API Version 2 移行ガイド](#第八部-api-version-2-移行ガイド)

---

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
3. エラーが出たら直して再読み込み (第五部)
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

---

# 第二部: API リファレンス

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

- `bloxdTime()` は3600秒で折り返す経過時間 (`bloxdTimeWrap`)。ゲーム内の昼夜時計と同期しているとは限らない。bind group の stage 可視性が VERTEX|FRAGMENT のため **vertex フックからも呼べる**
- `bloxdSunDirection()` は太陽が存在するときの単位ベクトルで、空に太陽がない場合はゼロ。**月は常に `-bloxdSunDirection()` にある** (エンジンが月の位置を太陽の正反対に計算するため)。ただし既定ワールドでは太陽が静止しているため月も静止しており、動く月が意味を持つのは昼夜サイクルを実装したワールドだけである (第七部 §1 参照)
- ※補足: 従来「ゼロ時に月の方向として再利用できない」と書いていたが、方向自体は `-bloxdSunDirection()` で得られる。外部配布するパックは `sunPresent` で分岐する書き方にしておくのが安全 (青い環境光の擬似表現については R2、方向性月光については第七部 R-A 参照)
- `emission` は照明計算の後に加算され、**`fogVisibility` で減衰される** (defaultLight の実装 `engineColour + emission × fogVisibility`。完全に霧に沈む遠景では発光も消える)
- **フォグ適用順序**: フラグメント内の処理順は ① 照明・発光の合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light フック呼び出し → ⑤ return。したがって **engineColour はフォグ済み**で届き、**light フックの返り値がそのまま最終色** (フック後にフォグは再適用されない)
- **fogVisibility の定義元**: ビュー空間距離 (頂点単位で計算・補間)。linear モードでは `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 のとき**: `fogColour` には `vec3f(0.0)` (黒) が渡る。fogColour の色味で時間帯を推定するコードは注意
- **現行ビルドの実フォグ設定**: **linear 固定**。`fogStart = 描画チャンク距離`、`fogEnd = +1 チャンク` (地平線のみ)。フォグオフ設定では 100 / 101 チャンクに設定され実質無効。既定フォグ色は RGB(183, 191, 195)
- **`skyLight` / `blockLight` / `heldLight` は「リフト曲線」通過後の値**で届く。ヘッダコメントの `tone-mapped` がこれを指す: エンジンはフラグメントで必ず `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を掛けてからパックに渡す。生の voxel 値 (n/15) ではなく、例えば木の下 (生値 0.87) は **0.97 に持ち上げられて届く**。滑らかな階調用途ならそのままで良いが、**しきい値で日向/影を分離したい場合は逆変換 `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` で生値を復元してから使う** (R9.12)
- `skyLight` の実体は「その場所から空が見えるか」のボクセル遮蔽データ (= 影マップ) であり、単なる明るさパラメータではない (15章「影の真実」)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`、64B) は**ヘッダ関数経由でのみ使う**。パックから直接参照しない。stage 可視性は VERTEX|FRAGMENT のため、ヘッダ関数はフックの外のモジュールスコープ関数や vertex フックからも呼べる。深度テクスチャ (binding 1) は FRAGMENT 専用のため、`bloxdOpaqueBehind()` は surface / light フック限定である
- **`litColour` が起点に使える**: v1 ではフォグ済みの `engineColour` しかなかったため、自前の大気表現で二重フォグになりがちだった。v2 ではフォグ前・emission 前の `litColour` から始め、`bloxdApplyFog()` で自分のペースでフォグを掛け直せる
- **`blockId` でブロック種別を見分けられる**: テクスチャ色に依存しない識別。ただし ID とブロック種の対応表はエンジン内部のため、どの ID が何ブロックかはワールド内で実測する (第八部参照)
- **構造体の直接構築は禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` から変更する、または入力のコピーを使う

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

---

# 第四部: リアル化ガイド

## 13. エンジン既定ライティングとリアル化の余地

エンジン既定の照明は「掛け算だけ」であり、スペキュラ・フレネル・暖色/冷色分離・半球環境光は存在しない。以下が再構築可能な範囲である:

| 機能 | 既定 | パックで可能? |
|---|---|---|
| 拡散 (Lambert) | 方向光のスカラー総和のみ | ◎ `bloxdSunDirection()` で自前実装 (ラップ光源等) |
| スペキュラ (鏡面反射) | 皆無 | ◎ Blinn-Phong (R9.2) |
| フレネル | 皆無 | ◎ Schlick 近似 (R9.3) |
| 暖色トーチ / 冷色空光の分離 | 無色のまま | ◎ (R9.1) |
| 半球環境光 | 方向なし | ◎ 上=空色 / 下=地面 (R9.4) |
| トーンマップ | なし (clamp のみ) | ◎ ACES フィルミック (R9.5) |
| 大気遠近法 | フォグ (色の置換) のみ | ◎ 距離デサチュレート (R9.6) |
| 表面ディテール | テクスチャ解像度のみ | △ ハッシュノイズのマイクロバンプ (R9.8) |
| 頂点波 (水面) | 皆無 (平面) | ◎ allow 限定 (R7) |
| 波法線 / 太陽グリント | 皆無 | ◎ (R9.7) |
| 影 (スカイ遮蔽シャドウ) | `mix(環境色, 空色, skyLight)` で「そっと」混ぜるのみ | ◎ リフト逆変換 + しきい値カット + 太陽ゲート (R9.12)。木陰・屋根の下が明確に落ち、ブロック編集にリアルタイム追従 |
| 夜の月光処理 | 空色が暗くなるだけ | △ 月方向は入力に無いため方向性のある月光は不可。青い環境光やデサチュレートの擬似表現のみ (R2 夜の青い環境光 / R9.11) |

## 14. リアル化の実装パターン — 2つの流派

**流派 A: 加算修正 (defaultLight 起点)** — `engineColour` (完成色) を素地に、暖色グローや rim を足す。手軽で安全だが照明モデル自体は既定のまま。

**流派 B: 完全リライティング (s.colour 起点)** — `l.engineColour` を捨て、`s.colour` (アルベド) と LightIn の生素材から照明を組み直す。リアル化の本命。守るべき4点:

1. **フォグをかけ直す**: light フックは最終段 (フォグの後) なので `mix(l.fogColour, col, l.fogVisibility)` を自分で適用する (R9.10)。霧が濃すぎるときは `max(l.fogVisibility, 0.3)` のように下限を敷く。逆に engineColour 起点のパックで更に霧色を混ぜると二重フォグで白濁する
2. **unlit バリアントのフォールバック**: `#ifdef BLOXD_LIGHTING` の外では `defaultLight` に素通りさせる
3. **共用関数ごとガードする**: `BloxdLightIn` を引数に取る共用関数は fn ごと `#ifdef BLOXD_LIGHTING` で囲む (呼び出し側だけでは不十分)
4. **太陽方向が無いとき**: `bloxdSunDirection()` がゼロなら方向性スペキュラは計算しない。`l.directional` は光量のスカラーで方向ベクトルではないため、ハイライトの方向を復元する用途には使えない。必要なら方向性のない弱い環境光に切り替える。なお月の方向は `-bloxdSunDirection()` で得られる (昼夜サイクルのあるワールドでのみ動く。第七部 R-A)

## 15. 到達できない表現 (リアル化の「天井」)

| 表現 | 理由 |
|---|---|
| ピクセル精度のシャドウマップ (太陽と一緒に回る影・ペンンブラ) | 深度テクスチャの参照不可 (液体限定の `bloxdOpaqueBehind()` は幾何情報のみでシャドウマップには使えない)。光視線の遮蔽判定もフックに入力されない |
| SSAO | シーン深度にアクセスできない (AO は頂点色に焼き込まれたもののみ。液体限定の深度は SSAO には使えない) |
| SSR (反射) | シーン色は取れない。フレネルで空色を乗せる疑似のみ |
| ブルーム / グレア | ポストプロセスにフックが存在しない |
| 被写界深度・色収差・グレイン | フルスクリーン後処理が必要 |
| 体積光 (god rays) | 同上 |
| PBR テクスチャ | テクスチャ参照禁止。色の輝度からの擬似推定のみ |
| 水中ヴェール (青色のティント) の除去・変更 | ヴェールは「カメラが入った液体ブロックの定義 color/alpha」から生成される emissive フルスクリーン quad で、フックのパイプライン外 (最前面) に描かれるため、パックからは色も濃さも変えられない |
| 水中の直接検出 | カメラが水中か示す入力は無く、水中でも fogStart / fogEnd / fogColour は変化しないため、fogVisibility などから水中を推定する信頼できる方法も無い |
| 水中屈折 | シーン色は取れない。液体限定の深度 (`bloxdOpaqueBehind()`) で厚み吸収・底面投影は可能 (第八部 R-E) |

### 影の真実 — 「木の影が落ちる」は作れる

上の表で不可能なのは**太陽と一緒に回るピクセル精度のシャドウマップ**だけである。エンジンは最初から「影」を計算しており、それが `skyLight` である。メッシュ生成側の LightEngine は Minecraft 型のアルゴリズムで動く:

1. **縦列スキャン**: 各 (x,z) 列を上から下へ走査。空から来る光は 15 で始まり、**不透明ブロックで 0** になり、`lightFilter` (空気 1 / 水 3 / 不透明 15) で減光しながら降りる
2. **BFS フラッドフィル (幅優先探索)**: 6 近傍へ横に拡散 (1 ブロックで -1) — これが影の縁をソフトにする正体。半径 r の遮蔽物の下の生値は (15-r)/15 になる
3. blockLight (トーチ等) は RGB 3 チャンネル (4bit パック) の別 BFS

つまり `l.skyLight` は単なる明るさパラメータではなく、**「その場所から空が見えるか」のボクセル分解能の遮蔽データ = 影マップ**である。木の下・屋根の下・建物内部は数値として既に低く、頂点補間で滑らかに届く。そしてブロックを置けば/壊せば LightEngine が即座に再計算する = **リアルタイムに追従する影**である。バニラはこれを `mix(環境色, 空色, skyLight)` で「そっと」使うだけなので影が薄い。さらに `l.skyLight` はリフト曲線通過後の値 (10章) なので、`pow(skyLight, γ)` では γ=5 でも木の下 (0.97) を 0.86 しか落とせない — **ガンマ方式は数学的に勝てない**。

正しい道具は R9.12 の 2 段階 (**リフト逆変換で生値を復元 → しきい値 `smoothstep` で二値化**。`th = 1 - r/15` が「影とみなす遮蔽半径」の直接ダイヤル) に、**太陽の直接光を sky でゲートする** (空が見える場所にだけ太陽が届く = 投影の正体) を加え、日向=暖色 / 影=冷色で染める構成である。

**制限 (正直に)**: この影は「上方向の空」基準のため、**太陽が時間で動いても影は回らない**。分解能はブロック単位 (ソフトエッジは BFS の広がりによるもの)。なおエンジンの照明テンプレートには `var shadow: f32 = 1.;` というシャドウマップ用の栓が閉じたまま残っており (常に 1.0 = 無効)、ピクセル精度の回る影は「将来の実装予定」の痕跡と解釈される。ピクセル精度の回る影がどうしても必要なら、それは現行 API の外の話である。

### 水中の正体

水中の見た目は 3 層でできている:

1. **地形・液体の描画** = フックで操作可。**light フックは水中でも通常どおり呼ばれる**。パックの加工は「ヴェールの下」で効いている
2. **液体定義色のヴェール** = 不可。毎フレーム、カメラ位置のブロック ID を取得し、そのブロックが「定義 color を持ち alpha < 1」なら、その color/alpha で **emissive フルスクリーン quad** を最前面に描画する。ゲーム設定 `cameraTint` (RGBA) があればそちらが優先。ヴェールの alpha は液体ブロックの定義値 (水はかなり濃い) で、全面がエンジン既定の水色に支配される
3. **cameraTint** = 不可

水中でも fogStart / fogEnd / fogColour は不変のため、**fogVisibility は水中判定に使えない**。差が見えにくいのはヴェールのせいであり、パック自体は水中でも動いている。

## 16. デバッグのコツ

- 洞窟が明るすぎる → `skyLight` の非線形カーブが足りない (R2 洞窟レシピ / R9.9)
- 木の下・屋根の下を `pow(skyLight, γ)` でどれだけ盛っても暗くならない → `l.skyLight` はリフト後の値 (10章)。R9.12 の逆変換 + しきい値カットに切り替える
- 影の面積・濃さを調整したい → R9.12 の調整ガイド参照 (面積=しきい値 `shTh` / 縁=`shSoft` / 芯の暗さ=最低環境光と空散乱光の 2 点シフト)
- 昼間が白飛びする → ACES 前の露出を下げる
- 夜が暗すぎる → 最小環境光を確保する。`bloxdSunDirection()` がゼロのときは真の月方向は分からないため、青い環境光などの擬似表現にする
- 夜なのに照らされた面だけ明るすぎる → 影の色だけを暗くせず、エンジンの完成色 (`engineColour`) 全体にも夜間減衰をかける。局所光を残す場合は `blockLight` / `heldLight` を使って減衰を弱める (第六部 19節)
- 遠景が霞みすぎる → 大気減衰の係数を下げる
- 松明の周りがオレンジだらけ → 暖色ブレンドの比率を下げる (素の色つき光を残す)
- ブロックがほとんど真っ白になる → light フック出力の合計が 1.0 超過 (出力の先にクランプは無い)。最後に `clamp(col, vec3f(0.0), vec3f(1.0))` を入れる
- 加算が無いのに白い → fogVisibility の除算による un-fog 逆算が原因。un-fog を外し、再構築するなら `s.colour` 起点にしてフォグは最後に一度だけ `mix`
- 発光ブロックが光らない → 再構築系で emission の再加算漏れ。`+ s.emission * l.fogVisibility` を足す

---

# 第五部: トラブルシューティング・注意

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む (v2 ではフィールド常在のため通常は起きない。判定用途のガードは残す) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` を起点に書き換える |
| `pack.json needs "apiVersion": 2.` | `apiVersion` が無いか `2` でない。数値の `2` を入れる (文字列の `"2"` は不可)。v1 パックは `shaderPack:loadWrongApiVersion` で拒否される |
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
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | エラーではなく strict ゲームでの自動無効化 (`shaderPack:offInStrict`)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第2段階 (ブラウザ Tint) のエラー。`^` `&` `\|` `<<` `>>` のオペランドは括る (§38) |
| zip 読み込みで `loadDuplicateManifest` | `pack.json` が 2 つある (大文字小文字違いも含む)。1 つにする |
| 遠景が白く濁る | フォグの二重掛けが原因のことが多い。完成色はフォグ済みなので独自の霧色は控えめに、彩度だけ落とす方式を検討する |
| ゲーム参加時にパックが除外される | ゲーム開始時の実機チェックで失敗している。ガード漏れを見直す |

## 18. 権利・注意

- シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パック制作は想定内の行為と考えられる。ただし公開公式ドキュメントは確認できていない
- パックは純粋な WGSL であり、JS 実行・ネットワークアクセスは設計上不可能
- 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる

---

# 第六部: 実装時の重要な補足

## 19. 夜間に「影は暗いのに表面だけ明るい」を直す

影だけを暗くする処理では、太陽がない時間にもエンジンの完成色 (`engineColour`) が明るいまま残り、面と影の差が不自然になることがある。影の色調ではなく、完成色全体に減衰をかける必要がある。

次の例は `bloxdSunDirection()` がゼロなら夜側、方向があるなら昼側として扱い、暗い時間は地形の完成色を減衰させる。照明対応バリアントでは `blockLight` と `heldLight` が強い場所ほど減衰を弱め、松明などの近距離光をなるべく残す。`0.52` は調整値で、より暗くしたいなら小さくする。

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

**この処理の限界:** `bloxdSunDirection()` の仕様が「太陽あり=単位方向、太陽なし=ゼロ」の二値なら、昼と夜の区別はできても夕焼け・薄明を連続的に推定できない。また完成色を減衰するため、エンジン側の昼光・環境光をまとめて弱める方式であり、時間帯を完全に再現するものではない。液体にも同じ処理を適用したい場合は液体フックのフォールバック関係を確認すること。

## 20. 水を自然に見せるための統合レシピ

このAPIではシーン色をサンプリングできないため、**本物の反射・屈折ではなく、フレネル風の色ブレンドと太陽ハイライトによる疑似表現**になる (水深計算は v2 の `bloxdOpaqueBehind()` で可能になり、第八部 R-E に分離した)。以下は色のベースを残しながら、浅い視線角度で空色に近い色を少し混ぜ、太陽があるときだけ小さなグリントを足すサンプル。

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

- 水が白っぽい / 明るすぎる: `fresnel * 0.38` の `0.38` とグリントの `0.55` を下げる。
- 水が濃すぎる: `fakeSkyReflection` の混合率を少し上げる。ただし上げすぎるとプラスチックのようになる。
- 水面に線や規則的な縞が見える: 波の周波数やグリント強度を下げる。水面メッシュ自体の頂点変位はこのコードにはない。
- 実際の景色を映したい: このAPIの入力には画面色がないため、色を混ぜるだけでは実反射にならない (深度は液体限定で取得可。第八部 R-E)。

このレシピは既存の `bloxdLiquidLight` を**置き換える**もの。R9.7 の同名波法線関数や他の同名フックと重複して貼らない。

## 21. 実機テストのチェックリスト

コンパイル成功と「見た目が良い」は別なので、次の順で確認する。

1. **読み込み:** `pack.json` が ZIP 直下にあること、設定画面で `Ready to use` になることを確認する。
2. **8バリアント:** strict / allow、照明 on / off、terrain / liquid の各条件で型ガード漏れがないことを確認する。ゲームが一部条件しか使わない場合でも、配布用パックは8通りを想定する。
3. **日中:** 草・石・砂・木材など素材ごとに色が飛んでいないか、上面と側面で明暗差が不自然でないかを見る。
4. **夜間:** 日向だった場所と同じ素材、影、松明の近くを比較する。明るい面だけが残るなら露出減衰、全部が暗くなるなら局所光保護を調整する。
5. **水:** 真上・浅い視線角度・岸辺・水中・夜を別々に見る。アルファの挙動と水中の見え方はゲーム側の合成方法に依存するため、ひとつの視点だけで判断しない。水中は第七部のとおり液体定義色のヴェールが最前面に掛かるため、パック有無の差は主に水面とヴェール越しの地形で確認する。
6. **境界と距離:** チャンク / 原点の切り替わりで波や模様が飛ばないか、遠景で二重フォグや白い霞が出ないかを確認する。
7. **性能:** ハッシュ・三角関数・`pow` を多用する効果は必要最小限にする。ディテールを少しずつ追加し、FPSを比較する。

### 既知の制約を前提にする

- shader pack は terrain / liquid のフックに限定され、空・エンティティ・UIを同じコードで処理する仕組みではない。
- 影マップ、画面空間反射、屈折、ブルームなどを追加するための入力はこのAPIにない (シーン深度は液体限定で `bloxdOpaqueBehind()` として解禁。第八部参照)。
- `bloxdTime()` はアニメーション用の時間で、ゲーム内の昼夜と連動する保証はない。
- `bloxdSunDirection()` がゼロなら真の月方向ではなく、青い環境光を加える処理は雰囲気を作る近似。方向性のある月光は `-bloxdSunDirection()` で作れる (昼夜サイクルワールド限定。第七部 R-A)。
- `s.position` / `l.position` はローカル座標なので、ワールド位置に依存する効果では `bloxdOriginOffset()` を加える。ブロック内ローカルの模様を作る場合は、意図的にローカル座標を使うこともある。

## 22. シェーダー単独で限界がある場合の組み合わせ

シェーダーパック側でテクスチャを追加・サンプリングできない制約があるため、素材そのものの細かな凹凸や空の画像を変えたい場合は、シェーダーだけで解決しようとしない。Bloxd.io向けの公開テクスチャーパックリポジトリ [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) には、テクスチャ、skybox、モデル等を扱う別方式の例がある。これはシェーダーパックAPIの公式仕様書ではなく、別システムのリソース例として参照する。

参考までに、コミュニティで「cinematic shader」として出回っている配布物を解析した事例では、中身はテクスチャパック (128x128 テクスチャで `pack.json` / `.wgsl` を含まない) だった。「影付きシェーダー風」の見た目の多くはテクスチャ側の工夫であり、シェーダーパックで光と影を作り分ける (R9.12) 方針と、テクスチャ側の補完を組み合わせるのが現実的である。

現実的には、**シェーダーで光と色を調整し、対応する別のリソースパックで素材や空を補う**方針がよい。ただし、別パックとの同時利用可否や読み込み順はゲーム側の実装・設定で確認する。

## 23. 水中とシェーダーパックの実情

水中の見た目は次の 3 層である:

| 層 | 内容 | パックで操作可? |
|---|---|---|
| ① 地形・液体の描画 | フックで加工できる。light フックは水中でも通常どおり呼ばれる | 可 (ヴェールの下で効いている) |
| ② 液体定義色のヴェール | カメラ位置の液体ブロック定義 color/alpha の emissive フルスクリーン quad (最前面)。ゲーム設定 `cameraTint` があればそちらが優先 | 不可 (色も濃さも変えられない) |
| ③ cameraTint | ゲーム設定 | 不可 |

実用上の要点: 水中でもパックは動いている / ヴェールは消せない / 水中を条件分岐できない (fogStart / fogEnd / fogColour は水中でも不変のため、fogVisibility から推定する方法も無い)。

---

# 第七部: 内部仕様の補足

エンジン実装の解析で判明した追加仕様。いずれも現行本番ビルドの JavaScript から直接復元したものである。

## 24. 太陽と月の正体

`bloxdSunDirection()` の供給源はスカイボックスの種類が変わったときだけ書き換えられる太陽方向バッファであり、判定基準は「空に太陽があるか」ではなく**「スカイボックスが earth 型か否か」**である。

| スカイボックス | `bloxdSunDirection()` |
|---|---|
| `default` (手続き空) | 非ゼロ (下記の既定値) |
| `gloomy` / `interstellar` / `space_*` (キューブテクスチャ) | **常に (0,0,0)** |

**月は常に `-bloxdSunDirection()` にある** (エンジンが月の位置を太陽の正反対に計算するため)。夜の判定は太陽高度で行う — `bloxdSunDirection().y < 0` (太陽が地平線の下) のとき月が上にある。ただし既定ワールドでは太陽が静止しているため月も静止しており、動くのは昼夜サイクルを実装したワールドだけである。

既定ワールドの太陽方向は約 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 から計算される単位ベクトル、静止)。配布パックのテスト時にハイライトの方向を机上で予測できる基準値である。

昼夜サイクルはエンジンに組み込まれていない — inclination は静的な数値であり、昼夜が動くワールドはゲーム側が更新している。その更新のたびに `bloxdSunDirection()` も書き換わるため追従する。

地形の方向光はシーン起動時に作られる 2 灯のみで**方向も強度も固定、昼夜で変化しない**。まとめると**地形の明るさを決める要素はどれも時間に依存しない。昼夜の「見た目」はスカイボックスと bloxdSunDirection() のみ**であり、夜に地形を暗くしたいパックは bloxdSunDirection() から自分で時間帯を推定する (§19 の `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −bloxdSunDirection()

月が上にある時間だけ、青白い Lambert と弱いスペキュラを加える。`moonUp` が 0 の世界 (既定の静止太陽ワールド) では何も起きないため、**昼夜サイクルのあるワールドだけで発動する安全な月光**になる。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 月は常に太陽の正反対。昼の間は moonDir.y < 0 で自動的に消灯する
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

フォグ計算は常に LINEAR モード (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`、clamp 0..1) で、`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)` (D = フォグ距離設定。D = 0 のときだけ fogEnd = 5 の特例) である。**フォグの傾斜帯はわずか 32 ブロック幅**であり、`l.fogVisibility` は「距離による霧」というより**「読み込み済みワールドの縁までの正規化距離」**の指標である。プレイヤーごとに読み込み距離が違うため、距離ベースの演出は自分で `distance(l.position, bloxdEyePosition())` を計算すべきである (レシピ R-B)。

既定のフォグ色は `rgb(183, 191, 195)` (淡い青灰色)。ワールド作成者は `fogColourOverride` (hex) で変更できる。フォグモードが 0 (NONE) の状態では **fogColour は黒で届く** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`)。`mix(l.fogColour, col, l.fogVisibility)` の標準形なら fogVisibility が 1 のとき霧色が使われないため安全。

プレイヤー側の `showFog` を false にするとフォグは 3200〜3328 ブロックへ追いやられ実質無効化される (fogVisibility ≈ 1 が返り続ける)。

### R-B. 読み込み境界バンド — fogVisibility を「ワールドの縁」として使う

読み込み境界の 32 ブロック帯だけを静かに冷色で締めて、ワールドの端を目立たなくする。距離を自分で計算しないため、プレイヤーの読み込み距離設定に自動追従するのが利点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内側 (境界まで余裕あり), 0 = 境界の外へ出る直前
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight の内部構造

`aPackedLightLevels` のデコード時に、エンジンは各チャンネルに **RGB の最も明るいチャンネルの 35% を下限にする「35% チャンネル床」**を敷く。例えば「真っ赤な光源」は (1.00, 0.35, 0) に持ち上げられてから補間・リフトを通る。松明の橙が「赤というより白っぽいピンク」に見えるのはこのためであり、暖色トーチ系レシピ (R9.1) の彩度はこの既定挙動を基準に調整すると良い。

手持ち光 (`heldLight`) は範囲が光色の最も明るいチャンネル値 (最大 15 ブロック) で決まり、距離に `dist^0.75` の前処理が入る。blockLight と同じ 35% チャンネル床が適用され、`l.heldLight` はアンビエントブースト**前**の値である。カスタムアイテムには `spotlightRange` (射程) と円錐角を設定でき、円錐光の位置はカメラに追従する。パック側からビーム方向を知る手段は無い。

`skyLightEmission` (0〜15) を持つカスタムブロックは、**blockLight の BFS とは別に skyLight チャンネルそのものを注入できる**。R9.12 のような「skyLight のしきい値で日向/影を判別する」パックは、人工光源で skyLight が持ち上げられているワールドでは誤判定になりうる。配布パックでは blockLight との組み合わせで判定する方が頑健である。

## 27. パイプライン細部

- **surface フックは alphaTest の「手前」で動く**: `out.alpha` がそのまま discard 判定に使われる。カットアウトマテリアル (草・葉など) ではディザパターンで溶けるようなエフェクトが作れる (レシピ R-C)。液体 (ブレンド描画) では `out.alpha` が実際の透明度になる (レシピ R-D)。通常の不透明地形では alpha は最終的に無視される
- **`l.ambient` の中身**は `material.ambient × sceneAmbient` でマテリアルごとに異なる値である。シーン側はグラフィック設定「Ambient Lighting Intensity」(既定 0.5) に直結しているため、既定値の決め打ちをしないこと
- **`bloxdTime()` の正体は `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` であり、ブラウザの起動経過時間を 1 時間で折り返した値である。ゲーム内昼夜ともワールドの経過時間とも無関係。ゲーム内時計と同期したアニメーションを作りたい場合は、昼夜サイクル実装ワールドの `bloxdSunDirection()` 方位角から推定するのが現実的である
- チャンク読み込み時の「細かい市松模様」はエンジンの画面空間 Bayer 4×4 ディザによるチャンクフェードであり、パック由来のバグではない
- **`mod` は予約語**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` で拒否される。剰余は `%` 演算子で書く

### R-C. Bayer ディザ溶解 — out.alpha が discard を制御する

エンジンがチャンクフェードに使っているのと**同じ Bayer 4×4 テーブル**を再現し、低いブロックから順にディザで「溶ける」cutout を作る。alphaTest マテリアル (草・葉など) では discard が走り、液体ではブレンドの透明度になる。

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod は予約語なので % 演算子を使う
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
    // y が低いブロックから順に溶ける。dissolve が高いほど残る
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水のカメラ近接フェード — 液体の alpha で見通しを確保

液体フックの `out.alpha` はブレンドに直結する。カメラ直下の水面だけを透かして、潜水・水上カメラの視界を確保するレシピ。

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

同じパックでも**ワールドとプレイヤー設定で `l.*` の中身は変わる**。配布前には少なくとも次の 3 環境で見た目を確認する:

1. **通常ワールド** (default スカイボックス・オーバーライド無し) — bloxdSunDirection() あり・既定色
2. **space 系スカイボックスのワールド** — bloxdSunDirection() = 0。`sunPresent` 分岐の見た目
3. **`visionMinLightColour`・`skyLightColourOverride` を設定したカスタムワールド** — 暗部と色が持ち上がるケース

主な変動源: `lightingOverride` (照明強制) / `skyLightColourOverride`・`ambientLightColourOverride` (hex 差し替え) / `visionMinLightColour` (視認最暗色の底上げ。Night Vision が使用。「洞窟を真っ暗に」系は想定より暗くならない) / `heldLightColourOverride`・`Range`・`ConeAngle` / `fogChunkDistanceOverride`・`fogColourOverride`・`fogOnSkybox` / `skyBox` (bloxdSunDirection() の有無)。`uSkyLightColour` 既定 = (1,1,1) 白、`uAmbientLightColour` 既定 = (0.25,0.25,0.30)。`l.ambient` のシーン成分 = グラフィック設定「Ambient Lighting Intensity」(既定 0.5)。`l.fogVisibility` はプレイヤーのフォグ/チャンク距離設定に追従。

## 29. デバッグ手段

- URL パラメータ `?renderer=lite` — Lite レンダラーを強制 (`?renderer=webgl2` / `babylon` も可)
- URL パラメータ `?vconsole` — 画面内コンソール (VConsole) 起動。モバイル実機検証で重宝する
- コンソールには `noa-engine v0.33.0` と `Renderer: lite from <ソース>` が出る — 描画パスの誤診断防止にまずこれを確認する
- WebGPU レンダラーはパック適用中「強制 ON」でロックされる。「Disable Block Texture Atlas」設定もロックされ (アトラス ON を維持)、WebGPU 非対応環境ではそもそもパックが適用できない。配布ページに「WebGPU 対応ブラウザが必要」と書く根拠はここである
- ゲーム参加毎にランタイム再検証 (`checkCompilation`) が走り、実在する全地形マテリアルで実コンパイルする (設定画面の静的検証より厳しい)。ここで落ちるとパックはそのゲームで除外される

## 30. ゲーム別の適用モード (`shaderPackPolicy`)

§7 の「allow / strict」がタイトル単位の設定であることをここで確定する。ゲーム定義側の `shaderPackPolicy` が明示的に `"allow"` のタイトルのみ full モード (vertex フック・`discard`・地形 `alpha`) で動き、指定が無い (または allow 以外の) タイトルは strict となる — `BLOXD_STRICT` が定義され、ガード内コードは自動的に無効化される。この判定はパック側からは選べないため、どのタイトルで何が動くかを知っておくのが配布の前提になる。

- 根拠ビルド: `szby6g.main.94a7596c.js` (2026-10-17 時点の本番デプロイ)。全 111 ゲーム定義を静的解析した結果、**allow 26 エントリ (12 タイトル) / strict 85 エントリ**。
- allow は基底定義の直書き 8 箇所と基底変数 (`tb` / `kz` / `cb` / `Fb`) の 4 箇所の計 12 箇所で宣言され、バリエーションはスプレッド継承 (`{...tb,...}`) で受け継ぐ。バリエーション単位の個別上書き (親 allow・子 strict の逆パターン) は現状ゼロ。

allow の 12 タイトル (計 26 エントリ):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (計 11 エントリ)
- **Doodle Cube** — 本体 + Solos / Duos (計 3)
- **Rocket Obby** — 本体 + Sheep / January (計 3)
- **単独タイトル (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 側で特に誤解しやすい点:

- **Superflat Creative (classic_creativeFlat) は strict**。「Creative」を名に含むが、classic 家族で allow なのは通常の Creative (`classic_creative`) のみ。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等も全件 strict
- **Custom Games (customGames) は strict**。自作カスタムゲームでは vertex フック系の効果は発動しない。作業用の検証は Test Gym で行うのが確実
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系の主要 PvP・サーバー系タイトルはすべて strict

なお strict タイトルでもパックの読み込みとコンパイル自体は行われ、surface / light 等のフラグメント側レシピは通常通り動く。制約を受けるのは vertex フック (`bloxdTerrainVertex` / `bloxdLiquidVertex`) と `discard`、および地形の `alpha` (液体は常に存在) である。

この一覧は上記ビルド時点の静的解析結果であり、エンジンの更新で allow/strict の配分は変わり得る。新版が出たら再確認すること。

---

# 第八部: API Version 2 移行ガイド

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

フックの種類 (vertex / surface / light × terrain / liquid の6種) と `pack.json` の形式 (`apiVersion` / `name` / `author`) に変更はない。ローダー制限も不変 (zip 32MB / エントリ 1024 / `.wgsl` 256 個 / 合計 256KB / manifest 64KB)。

## 33. 削除フィールドの移植先

v1 では `time` / `eyePosition` / `sunDirection` / `originOffset` は構造体のフィールドだった。v2 では**これらのフィールドは削除され、代わりにエンジン uniform (`bloxdPackInputs`) を読むヘッダ関数**を使う。関数は uniform を直接読むため、**フックの外のモジュールスコープ関数や vertex フックからでも呼べる**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` によるワールド座標化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 新機能 ①: `blockId` (ブロック固有シェーディング)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` の3構造体すべてに `blockId: u32` が追加された。**面が属するブロックの ID** (0〜65535) で、同じ面の全域で一定 (`@interpolate(flat)` で渡される)。テクスチャの色に依存しないブロック種別の識別に使う。ただし ID とブロック種の対応表はエンジン内部にありパックからは参照できないため、**どの ID が何ブロックかはワールド内で実測する**しかない。

### R-F. blockId によるブロック種別ティント

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例: 石系 (id の上位ビットパターン) を寒色に傾ける
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. 新機能 ②: `BLOXD_SCENE_DEPTH` と `bloxdOpaqueBehind()` (本命)

v1 で構造的に不可能とされた深度アクセスが、**液体 (liquid) プログラムに限り**解禁された。色は取れないが、**奥の不透明面までの距離と位置という幾何情報が取れる**。典型的な使い方は水の厚みを測った吸収色の計算である。

使用ルール:

| 使い方 | 結果 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 内でガード無しで呼ぶ | OK (液体バリアントでは常に定義) |
| `bloxdTerrainSurface` 内でガード無しで呼ぶ | ERROR。`#ifdef BLOXD_SCENE_DEPTH` で囲む |
| vertex フック内で呼ぶ | ERROR (surface / light フック限定) |

地形フックでも深度を使いたい場合は `#ifdef BLOXD_SCENE_DEPTH` で囲む (地形フックは液体プログラムにも流用されるため、液体側でのみ深度が有効になる)。

### R-E. 水の厚み吸収 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水の柱の長さ = 現在位置から奥の不透明面まで
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸収: 赤は速く落ち、青は遠くまで届く
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 奥が空 = 深い水色へ寄せる
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

応用: 厚みベースの吸収・散乱、`behind.position` からの底面ワールド座標による波紋・コースティック風模様の投影、`found=false` での空と遮蔽の区別による水面の空反射、深度による泡や濁りの段階付与。なお深度コピーのパイプライン構築に失敗した場合は「奥に何も無い」扱いへ安全に劣化する。

## 36. その他の v2 変更点

- **フックのフォールバック**: 液体プログラムは `bloxdLiquidXxx` が未定義のとき地形フックにフォールバックする。**地形フックだけのパックは水面にもそのまま効く**。意図しない場合は liquid 側のフックを明示定義する。
- **`BLOXD_LIGHTING` のフィールドガードは不要に**: 全バリアントで `blockLight` 等が存在し、unlit では既定値 (0 / 1 / 白 / 0) が入る。ライト判定をしたい場合のみ `#ifdef BLOXD_LIGHTING` を使う。既存のガードを残しても動作は変わらない。
- **`BLOXD_ALPHA` の定義条件が変化**: 非 strict の地形バリアントと全液体バリアントで定義され、strict × terrain では定義されない。地形フックで alpha を書く場合はガードを残すこと。
- **構造体の直接構築は禁止**: `BloxdLight(...)` 等のコンストラクタ呼び出しは静的検証で拒否される。必ず `bloxdDefault*` から変更する、または入力のコピーを使う。
- **`let _ =` は `_ =` に**: WGSL の破棄代入 `_ = f();` は有効だが `let _ = f();` は拒否される。
- **offInStrict**: vertex フックの定義、または surface / light フックから到達可能な `discard` があると、エラーではなくパック全体が strict ゲームで自動無効化される (設定 UI に `shaderPack:offInStrict` と表示、allow ゲームでは動作)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む。
- **フォグの拡張**: フォグ計算に LINEAR / EXP / EXP2 の3モードが実装されたが、ゲーム側の設定は従来どおり常に LINEAR のため、既存のフォグ仕様はそのまま使える。`fogColour` の意味も公式に明文化された (完全にフォグの無いシーンでのみ黒)。
- **変わっていないもの**: リフト曲線・35% チャンネル床・heldLight 減衰 (`pow(lightDist, 0.75)`) と環境光ブースト・太陽と月の方向仕様・既定フォグ色・time ラップ (3600 秒)・方向光 (最大 4 個)・Lite (WebGPU) 専用・保存機構 (IndexedDB)・`mod` 予約語。

## 37. v1 → v2 移行チェックリスト

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **識別子**: §32 の対応表で全部置換 (フック名・構造体名・default 関数名)
3. **削除フィールドの移植**: §33 の表に従いヘッダ関数へ (`s.time` → `bloxdTime()` 等)
4. **`fogFactor` → `fogVisibility`** に改名
5. **構造体直接構築を除去**
6. **`let _ =` を `_ =` に**修正
7. **vertex フックと discard は `#ifndef BLOXD_STRICT` で囲む**
8. **水面も地形フックの効果を受ける**ことを確認し、意図しなければ liquid フックを明示定義
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

// OK — 各乗算を括る (同一演算子の連鎖 A ^ B ^ C 自体は左結合で合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本書の掲載コードはこのパターンを含まない (`pack_hash3` の `+`/`*` 混在と `h ^ (h >> 16u)` は括弧済みのため仕様適合)。パックを書いたら第1段階と第2段階の両方を通すこと。

## 39. 独立した類似資料について

本書とほぼ同じ内容の社区資料として [GlitchHunterCoder/Bloxd-Essay の Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader) が存在する。こちらは本書より先に公開されているが、**本書の内容は glm が Bloxd の本体バンドルファイル (webpack チャンク群) を実際に解析して得た情報であり、コピペなどではない**。両者が一致するのは、同じ実装を独立に調べれば同じ結論に至るためである。

---

調査: ltf_ahel (glm を使用して調査)


