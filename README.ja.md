# Bloxd.io シェーダーパックの作り方 (完全版)

Bloxd.io のシェーダーパック (WebGPU レンダラー専用) を自作・配布するための単独完結の手順書。
`apiVersion: 1` 時点の仕様に基づく。レシピ集と API リファレンスを含むため、この1ファイルだけで最初から配布まで行える。

> 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる。  
> 本書はAIの支援を受けて作成されており、内容の正確性は保証されない。実際のゲーム動作で確認すること。  
> 最終レビュー: 2026-10-15 (フォグ適用順序・フォグ実設定・水中の描画構造をレンダラー実装と照合し更新)。専用の公開公式WGSL APIリファレンスを確認できていないため、API説明とレシピは読み込み画面・実機コンパイルで継続検証すること。  
> シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パックは純粋な WGSL  
> (JS 実行・通信不可) のため、通常の記述で危険なことは起きない。

## 目次

- [第一部: 作り方](#第一部-作り方)
- [第二部: API リファレンス](#第二部-api-リファレンス)
- [第三部: レシピ集](#第三部-レシピ集)
- [第四部: リアル化ガイド](#第四部-リアル化ガイド)
- [第五部: トラブルシューティング・注意](#第五部-トラブルシューティング注意)
- [第六部: 実装時の重要な補足](#第六部-実装時の重要な補足)
- [第七部: 内部仕様の補足](#第七部-内部仕様の補足)

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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| フィールド | 必須 | 説明 |
|---|---|---|
| `apiVersion` | 必須 | `1` と完全一致させる |
| `name` | 必須 | 空文字不可。設定画面に表示される |
| `author` | 任意 | 省略可。文字列以外 (数値等) はエラー |

その他のフィールドは無視される。

## 5. 最小テンプレート

`pack.json` と以下の `pack.wgsl` だけで動くパックになる:

```wgsl
// ほんのり暖色にする最小パック
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

守るべき作法:

- 出力構造体は**直接構築しない** (`bloxd_Surface(...)` はエラー)。必ず `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` から作ってフィールドを書き換える。例外として light フックの第 1 引数 `s: bloxd_Surface` は出力と同型なので `var out = s;` で始めることもできる
- 未初期化の `var x: bloxd_Surface;` (型注釈だけの宣言) もエラーになる
- フックの引数は**読み取り専用**。書き換えたい場合は `var sv = s;` のようにコピーしてから
- 自分の識別子に `bloxd_` 接頭辞は使えない (6つのフック名を除く)
- 定数は `const` で書く (`#define` に値は書けない)

## 6. 6つのフック

すべて任意。シグネチャは型まで正確に一致させる (引数名は自由)。

| フック | 役割 |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | 地形の頂点移動。**strict では使用不可** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | 地形の色・透明度・発光。`s.colour` はテクスチャ×頂点色 |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | 地形の最終色。**フラグメントの最終段**で呼ばれ、返り値がそのまま最終色になる |
| `fn bloxd_liquid_vertex / _surface / _light` (同型) | 液体版。`alpha` は液体の透過率として効く |

フォールバックの規則:

- liquid フックが未定義なら **terrain の同名フックが使われる** (逆は無し)。surface だけ書けば液体にも同じ効果がかかる
- light フックが未定義なら既定動作 (`engineColour + emission × fogFactor`) になる
- `engineColour` を捨てて素材色から組み直した場合は、フォグを自分でかけ直すこと: `mix(l.fogColour, col, l.fogFactor)`。emission を足すときは `fogFactor` を掛けてから

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
- 座標は noaローカル座標。ワールド座標にするには `originOffset` を足す。ブロック座標は `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

解釈の要点:

- `time` は3600秒で折り返す経過時間。ゲーム内の昼夜時計と同期しているとは限らない。
- `sunDirection` は太陽が存在するときの単位ベクトルで、空に太陽がない場合はゼロ。**月は常に `-sunDirection` にある** (エンジンが月の位置を太陽の正反対に計算するため)。ただし既定ワールドでは太陽が静止しているため月も静止しており、動く月が意味を持つのは昼夜サイクルを実装したワールドだけである (第七部 §1 参照)
- ※補足: 従来「ゼロ時に月の方向として再利用できない」と書いていたが、方向自体は `-sunDirection` で得られる。外部配布するパックは `sunPresent` で分岐する書き方にしておくのが安全 (青い環境光の擬似表現については R2、方向性月光については第七部 R-A 参照)
- `emission` は照明計算の後に加算され、**`fogFactor` で減衰される** (defaultLight の実装 `engineColour + emission × fogFactor`。完全に霧に沈む遠景では発光も消える)
- **フォグ適用順序**: フラグメント内の処理順は ① 照明・発光の合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogFactor)` → ④ light フック呼び出し → ⑤ return。したがって **engineColour はフォグ済み**で届き、**light フックの返り値がそのまま最終色** (フック後にフォグは再適用されない)
- **fogFactor の定義元**: ビュー空間距離 (頂点単位で計算・補間)。linear モードでは `fogFactor = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 のとき**: `fogColour` には `vec3f(0.0)` (黒) が渡る。fogColour の色味で時間帯を推定するコードは注意
- **現行ビルドの実フォグ設定**: **linear 固定**。`fogStart = 描画チャンク距離`、`fogEnd = +1 チャンク` (地平線のみ)。フォグオフ設定では 100 / 101 チャンクに設定され実質無効。既定フォグ色は RGB(183, 191, 195)
- **`skyLight` / `blockLight` / `heldLight` は「リフト曲線」通過後の値**で届く。ヘッダコメントの `tone-mapped` がこれを指す: エンジンはフラグメントで必ず `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を掛けてからパックに渡す。生の voxel 値 (n/15) ではなく、例えば木の下 (生値 0.87) は **0.97 に持ち上げられて届く**。滑らかな階調用途ならそのままで良いが、**しきい値で日向/影を分離したい場合は逆変換 `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` で生値を復元してから使う** (R9.12)
- `skyLight` の実体は「その場所から空が見えるか」のボクセル遮蔽データ (= 影マップ) であり、単なる明るさパラメータではない (15章「影の真実」)
- `bloxd_packInputs` という uniform はエンジン内部に存在するが、**パックから直接参照できない**。値はフック入力のフィールド (`s.time` 等) 経由で使う

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

バリアントごとにヘッダ構造体の形も変わる (strict では `bloxd_Vertex` 自体が無い、照明off では `blockLight` 等が無い、strict地形では `alpha` が無い)。

## 12. 骨格チートシート

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // ← 直接構築は禁止。必ず default から
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain では allow の時だけ alpha がある
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // 照明 on だけの入力はガードする
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex は必ずこのガード付きで
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

常に意識する5点: 8バリアントすべてで通す / strict が大多数 / テクスチャ不可 / フック引数は読み取り専用 / `let` はモジュールスコープに置かない。

---

# 第三部: レシピ集

すべての断片は8バリアントを通す前提のガード付きで書いてある。そのままコピペして定数をいじるだけで使える。

## R1. 色のレシピ (surface)

> **重要:** 以下のレシピは個別の例であり、上からすべて連結する用途ではない。同じフック名 (`bloxd_terrain_light` など) や同じヘルパー関数名を複数貼ると、同一モジュール内で定義が重複してコンパイルに失敗する。複数の効果を使う場合は、フックを各種類1つにまとめ、処理をその関数内へ統合する。

### 単色ティント (最も基本)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 で 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 面の向きで塗り分け (上向き=明るく、壁=暗く)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 64 ブロックから 192 ブロックで 0..0.35 のフォグを自前で足す
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜 (skyLight 駆動の青シフト + 灯りの保護)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` はリフト後の値 (10章) のため、浅い遮蔽 (木の下など。生値 0.87 → リフト後 0.97) はこの方法ではほとんど暗くならない。洞窟 (生値 0) には効く。「木陰」をはっきりさせたい場合は R9.12 のリフト逆変換 + しきい値方式を使う。

### 夜の青い環境光 (月の方向を使わない擬似表現)

> このAPIでは、空に太陽がないとき `sunDirection` はゼロになる。以下は方向性のある月光ではなく、空が暗いときにごく弱い青い環境光を足すだけの疑似表現。なお月の方向自体は `-sunDirection` で得られる (昼夜サイクルワールド限定。第七部 R-A)。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平線で1/真上で0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### エンジン出力の完全置き換え (最も単純な再照明)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // ※ bloxd_Light(...) の直接構築は禁止。default から作って colour を書き換える
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (エンジンの照明結果) を捨てて「素材の色 × 自分で計算した明るさ」に置き換える
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogFactor);   // engineColour を捨てたのでフォグをかけ直す (必須)
    out.colour = col + s.emission * l.fogFactor;   // emission も自分で足す (必須)
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. 発光のレシピ (emission)

> `emission` は照明計算後に加算されるが、既定処理では **`fogFactor` が掛かって減衰する。つまり完全に霧に沈む遠景では emission も消える。遠景でも光らせたい成分は emission に足さず、light フック内で `out.colour += ...` として直接加算する** (engineColour はフォグ済みなので、遠景では霧色の上に光が乗る)

### 灯りの脈動 (松明が息をする)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 発光鉱石っぽい処理 (明るい素材を光らせる)

```wgsl
// surface 側: 素材が明るい (白い) ほど emission を盛る
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 蛍の群れもどき (時間で空間を漂う光点)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // 数個の「光の玉」がゆっくり移動する。distance の逆数で光らせる
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 座標のレシピ (ワールド/ブロック/視線)

### ワールド座標

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### ブロック座標

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 視線角度 (フレネルもどき — 液体向け)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 真上から 1 / 浅い角度 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 時間のレシピ (アニメーション)

> `time` は 3600 秒 (1 時間) で折り返す。ただしこれはシェーダーの経過時間であり、ゲーム内の太陽・昼夜と同期する保証はない。見た目の周期アニメーションには使えるが、実際の夜判定には `sunDirection` や照明入力を優先する。

### 昼夜サイクル (1 時間で 1 日)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 の1時間周期。ゲーム内の昼夜と同期するとは限らない
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
// XZ 位置と時間で 3 色を混ぜる
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid は常に BLOXD_ALPHA — ガードは習慣として
    #endif
    return out;
}
```

### 高度を使った透明度の疑似変化 (本当の浅瀬判定ではない)

> シーン深度や水底の位置を参照できないため、このAPIだけでは実際の水深を計算できない。`s.position.y` はローカル座標なので、そのまま使うと座標原点の変化で効果がずれる。以下はワールド高度を使ってアルファを変えるだけの疑似演出で、海岸線や水底に沿った浅瀬表現ではない。`packWaterReferenceY` はワールド高度に合わせて調整する。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低高度では薄く、高高度では元のアルファに近づける。ゲーム内で向きは要確認。
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 水中から見た水中霧

```wgsl
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 液体だけに効くパック (地形無傷の構成)

```wgsl
// terrain_* フックを一切書かない。すると:
//  - terrain バリアント = フック無し = 地形はエンジン既定のまま
//  - liquid バリアント  = liquid_* フックのみ有効
```

## R7. 頂点のレシピ (allow 限定)

> すべて `#ifndef BLOXD_STRICT` で囲むこと。

### 草が風に揺れる (上端だけ動かす)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 垂直面のみ
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面の波 (上面のみ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脈動する地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 法線方向にわずかに膨張収縮
    return out;
}
#endif
```

### 波打つ地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
> 1. **light フックはフラグメントの最終段で呼ばれる**。返した colour がそのまま最終色。**自分でフォグをかけ直す必要がある** (R9.10)  
> 2. **エンジン既定の照明は掛け算だけ**。スペキュラ / フレネル / 暖色-冷色分離 / 半球環境光はゼロから作れる  
> 3. `l.engineColour` は完成色 (フォグ済み)。捨てて `s.colour` (アルベド) から組み直すのが本格派  
> 4. テクスチャは禁止 → ディテールはすべて**手続き的** (ハッシュ/ノイズ) に入れる (R9.8)

### R9.1 暖色トーチ × 冷色空光

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogFactor);                    // フォグ掛け直し
    out.colour = col + s.emission * l.fogFactor;                 // emission 再加算
    #endif
    return out;
}
```

### R9.2 太陽スペキュラ (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 縁の薄い明るみ
    #endif
    return out;
}
```

### R9.4 半球環境光 (上=空 / 下=地面の跳ね返り)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下: 跳ね返り
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上: 空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogFactor);                           // フォグ掛け直し
    out.colour = col + s.emission * l.fogFactor;                        // emission 再加算
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 露出
    return out;
}
```

### R9.6 大気遠近法 (距離で彩度が落ちる「空気感」)

> 注意: 霞の色に輝度を持ち上げる処理 (`normalize` 等) を掛けると、霧の色が暗い場面で「明るい白い靄」が浮き、  
> engineColour (フォグ済み) の上にさらに霧色を混ぜると二重フォグで白濁する。**空気感は彩度だけを落とす**のが安全。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ブロック内ローカル座標
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> `l.fogFactor` を `max(l.fogFactor, 0.25)` のように下限付きにすると「これ以上濃くならない」調整ができる
> (0.0 = エンジン準拠 / 0.3〜0.5 = 遠景クリア)。
> なおエンジンのフォグは地平線専用のlinearフォグ (描画距離付近のみ) であり、中距離の霧はパック側で作る必要がある。
> 実フォグ設定 (実装照合済み): linear 固定 / `fogStart` = 描画チャンク距離 / `fogEnd` = +1 チャンク / フォグオフ時は 100〜101 チャンクで実質無効 / 既定色 RGB(183, 191, 195)。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // ← フォグ再現 (0.15=薄めの下限)
    col += s.emission * l.fogFactor;            // ← emission もフォグ済みで
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 シネマ-grade (影は寒色 / ハイライトは暖色 / 夜はデサチュレート)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let night = 1.0 - sunPresent;  // 太陽方向がゼロのときだけ夜扱い。夕暮れの連続変化は表現しない
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 投影風シャドウ — リフト逆変換 + しきい値カット (決定版)

> **前提の再確認 (10章)**: `l.skyLight` は生の voxel 値 (n/15) ではなく、エンジンが「リフト曲線」  
> `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を通した後の値。
>
> | 場所 | voxel 生値 | リフト後 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 開けた空 | 1.00 | 1.00 | 1.00 |  
> | 木の下 (半径2) | 0.87 | **0.97** | **0.86** ← ほぼ無傷 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **これが「ガンマを上げても影が濃くならない」の真因** (数値で証明)。しかし曲線は単調なので代数的に厳密に逆変換できる:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。生値を復元したら、後は**しきい値カット** (`smoothstep`) で二値化するだけ。  
> LightEngine の BFS 横拡散は「隣接 1 ブロック = -1」なので、しきい値 `th = 1 - r/15` はそのまま  
> 「r ブロック以上の遮蔽を影とみなす」ダイヤルになる。ブロックを壊せば影も即座に動く (LightEngine がリアルタイム再計算)。  
> 制限: 影は「上方向の空」基準なので太陽の移動では回らない (15章「影の真実」)。

```wgsl
// ★エンジンのリフトを厳密に逆変換して生の voxel skyLight (n/15) を復元
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL に cbrt は無いので pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★影半径ダイヤル: th = 1 - r/15 (0.87→半径2以上が影)
const shSoft = 0.04;   // 縁の柔らかさ (0.02=硬い / 0.08=ソフト)
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 生値復元 (これを飛ばすと永久に影にならない)
    let skyRaw = sh_unlift(l.skyLight);
    // ② しきい値カット — 日向=1 / 影=0 を確実に分離できる
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太陽 Lambert (太陽が無い空では l.directional にフォールバック)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★投影の正体: 太陽の直接光は「空が見える場所」にしか届かない
    let lit = sunL * sky;
    // 影側: 黒ではなく空色に染まる + 最低環境光
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // トーチ光は影を貫通する (blockLight もリフト後なので一緒に復元)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // フォグをかけ直す (engineColour を捨てたぶん)
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col + s.emission * l.fogFactor, vec3f(0.0), vec3f(1.0));   // emission も忘れずに (フォグ済みで加算)
    #endif
    return out;
}
```

> 調整ガイド: **影の面積は `shTh` だけで決まる** — `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 影の縁の硬さは `shSoft` (0.02=硬い / 0.08=ソフト)。影の芯の暗さは `0.09` (最低環境光) と `0.16` (空の散乱光)  
> の 2 点シフトで決まる。夕方に影を広げたければ  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` を足す (長い夕方の影の近似。  
> `sunDir` は `l.sunDirection / length(l.sunDirection)`)。影の青味は `vec3f(0.72, 0.82, 1.05)` の B を上げる。
>
> ⚠️ 「`pow(skyLight, γ)` でコントラストを深く」は**リフト後の値に gamma を掛けていた**ため  
> 木の下 (0.97) に効かなかった。この手法は非推奨。

---

# 第四部: リアル化ガイド

## 13. エンジン既定ライティングとリアル化の余地

エンジン既定の照明は「掛け算だけ」であり、スペキュラ・フレネル・暖色/冷色分離・半球環境光は存在しない。以下が再構築可能な範囲である:

| 機能 | 既定 | パックで可能? |
|---|---|---|
| 拡散 (Lambert) | 方向光のスカラー総和のみ | ◎ `sunDirection` で自前実装 (ラップ光源等) |
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

1. **フォグをかけ直す**: light フックは最終段 (フォグの後) なので `mix(l.fogColour, col, l.fogFactor)` を自分で適用する (R9.10)。霧が濃すぎるときは `max(l.fogFactor, 0.3)` のように下限を敷く。逆に engineColour 起点のパックで更に霧色を混ぜると二重フォグで白濁する
2. **unlit バリアントのフォールバック**: `#ifdef BLOXD_LIGHTING` の外では `defaultLight` に素通りさせる
3. **共用関数ごとガードする**: `bloxd_LightIn` を引数に取る共用関数は fn ごと `#ifdef BLOXD_LIGHTING` で囲む (呼び出し側だけでは不十分)
4. **太陽方向が無いとき**: `sunDirection` がゼロなら方向性スペキュラは計算しない。`l.directional` は光量のスカラーで方向ベクトルではないため、ハイライトの方向を復元する用途には使えない。必要なら方向性のない弱い環境光に切り替える。なお月の方向は `-sunDirection` で得られる (昼夜サイクルのあるワールドでのみ動く。第七部 R-A)

## 15. 到達できない表現 (リアル化の「天井」)

| 表現 | 理由 |
|---|---|
| ピクセル精度のシャドウマップ (太陽と一緒に回る影・ペンンブラ) | 深度テクスチャの参照不可。光視線の遮蔽判定もフックに入力されない |
| SSAO | シーン深度にアクセスできない (AO は頂点色に焼き込まれたもののみ) |
| SSR (反射) | 同上。フレネルで空色を乗せる疑似のみ |
| ブルーム / グレア | ポストプロセスにフックが存在しない |
| 被写界深度・色収差・グレイン | フルスクリーン後処理が必要 |
| 体積光 (god rays) | 同上 |
| PBR テクスチャ | テクスチャ参照禁止。色の輝度からの擬似推定のみ |
| 水中ヴェール (青色のティント) の除去・変更 | ヴェールは「カメラが入った液体ブロックの定義 color/alpha」から生成される emissive フルスクリーン quad で、フックのパイプライン外 (最前面) に描かれるため、パックからは色も濃さも変えられない |
| 水中の直接検出 | カメラが水中か示す入力は無く、水中でも fogStart / fogEnd / fogColour は変化しないため、fogFactor などから水中を推定する信頼できる方法も無い |
| 水中屈折 | シーン深度の入力が無い |

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

水中でも fogStart / fogEnd / fogColour は不変のため、**fogFactor は水中判定に使えない**。差が見えにくいのはヴェールのせいであり、パック自体は水中でも動いている。

## 16. デバッグのコツ

- 洞窟が明るすぎる → `skyLight` の非線形カーブが足りない (R2 洞窟レシピ / R9.9)
- 木の下・屋根の下を `pow(skyLight, γ)` でどれだけ盛っても暗くならない → `l.skyLight` はリフト後の値 (10章)。R9.12 の逆変換 + しきい値カットに切り替える
- 影の面積・濃さを調整したい → R9.12 の調整ガイド参照 (面積=しきい値 `shTh` / 縁=`shSoft` / 芯の暗さ=最低環境光と空散乱光の 2 点シフト)
- 昼間が白飛びする → ACES 前の露出を下げる
- 夜が暗すぎる → 最小環境光を確保する。`sunDirection` がゼロのときは真の月方向は分からないため、青い環境光などの擬似表現にする
- 夜なのに照らされた面だけ明るすぎる → 影の色だけを暗くせず、エンジンの完成色 (`engineColour`) 全体にも夜間減衰をかける。局所光を残す場合は `blockLight` / `heldLight` を使って減衰を弱める (第六部 19節)
- 遠景が霞みすぎる → 大気減衰の係数を下げる
- 松明の周りがオレンジだらけ → 暖色ブレンドの比率を下げる (素の色つき光を残す)
- ブロックがほとんど真っ白になる → light フック出力の合計が 1.0 超過 (出力の先にクランプは無い)。最後に `clamp(col, vec3f(0.0), vec3f(1.0))` を入れる
- 加算が無いのに白い → fogFactor の除算による un-fog 逆算が原因。un-fog を外し、再構築するなら `s.colour` 起点にしてフォグは最後に一度だけ `mix`
- 発光ブロックが光らない → 再構築系で emission の再加算漏れ。`+ s.emission * l.fogFactor` を足す

---

# 第五部: トラブルシューティング・注意

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む |
| `Packs can't construct bloxd_Surface directly` | `bloxd_defaultSurface(s)` を起点に書き換える |
| `pack.json needs "apiVersion": 1.` | `apiVersion` が無い。数値の `1` を追加する (文字列の `"1"` は不可) |
| `There's no pack.json at the top of the pack.` | ZIP直下に `pack.json` が無い。フォルダごと固めていないか確認する |
| `bloxd_terrain_vertex must be declared as: fn ...` | シグネチャ不一致。表示された宣言どおりに書き直す |
| `bloxd_terrain_vertex can't run in strict games...` | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` で囲む |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` で囲む |
| `pow(l.skyLight, γ)` をいくら上げても影が濃くならない | `skyLight` はエンジンのリフト曲線通過後の値 (生値 0.87 が 0.97 で届く)。R9.12 のリフト逆変換 + しきい値カットに切り替える (10章) |
| `... can only be a function's parameter or return type, ...` | 未初期化の `var x: bloxd_Surface;` は不可。`bloxd_default*` から作る |
| `bloxd_packInputs isn't part of the bloxd_ header` | PackInputs uniform はパックから参照不可。`s.time`・`s.originOffset`・`s.sunDirection` 等のフック入力フィールド経由で使う |
| `Packs can't declare bloxd_ names...` | 自分の識別子から `bloxd_` 接頭辞を外す。定義できるのは 6 つのフック名だけ |
| zip 読み込みで `loadDuplicateManifest` | `pack.json` が 2 つある (大文字小文字違いも含む)。1 つにする |
| `Packs can't construct bloxd_Surface directly, since header structs gain fields; ...` | `bloxd_defaultSurface(s)` 等を起点に書き換える。light フック第 1 引数のコピー `var out = s;` から始めるのも可 |
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

次の例は `sunDirection` がゼロなら夜側、方向があるなら昼側として扱い、暗い時間は地形の完成色を減衰させる。照明対応バリアントでは `blockLight` と `heldLight` が強い場所ほど減衰を弱め、松明などの近距離光をなるべく残す。`0.52` は調整値で、より暗くしたいなら小さくする。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**この処理の限界:** `sunDirection` の仕様が「太陽あり=単位方向、太陽なし=ゼロ」の二値なら、昼と夜の区別はできても夕焼け・薄明を連続的に推定できない。また完成色を減衰するため、エンジン側の昼光・環境光をまとめて弱める方式であり、時間帯を完全に再現するものではない。液体にも同じ処理を適用したい場合は液体フックのフォールバック関係を確認すること。

## 20. 水を自然に見せるための統合レシピ

このAPIではシーン色・深度・水底の深度をサンプリングできないため、**本物の反射・屈折・水深計算ではなく、フレネル風の色ブレンドと太陽ハイライトによる疑似表現**になる。以下は色のベースを残しながら、浅い視線角度で空色に近い色を少し混ぜ、太陽があるときだけ小さなグリントを足すサンプル。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- 実際の景色を映したい: このAPIの入力には画面色やシーン深度がないため、色を混ぜるだけでは実反射にならない。

このレシピは既存の `bloxd_liquid_light` を**置き換える**もの。R9.7 の同名波法線関数や他の同名フックと重複して貼らない。

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
- 影マップ、画面空間反射、シーン深度、屈折、ブルームなどを追加するための入力はこのAPIにない。
- `time` はアニメーション用の時間で、ゲーム内の昼夜と連動する保証はない。
- `sunDirection` がゼロなら真の月方向ではなく、青い環境光を加える処理は雰囲気を作る近似。方向性のある月光は `-sunDirection` で作れる (昼夜サイクルワールド限定。第七部 R-A)。
- `s.position` / `l.position` はローカル座標なので、ワールド位置に依存する効果では `originOffset` を加える。ブロック内ローカルの模様を作る場合は、意図的にローカル座標を使うこともある。

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

実用上の要点: 水中でもパックは動いている / ヴェールは消せない / 水中を条件分岐できない (fogStart / fogEnd / fogColour は水中でも不変のため、fogFactor から推定する方法も無い)。

---

# 第七部: 内部仕様の補足

エンジン実装の解析で判明した追加仕様。いずれも現行本番ビルドの JavaScript から直接復元したものである。

## 24. 太陽と月の正体

`l.sunDirection` の供給源はスカイボックスの種類が変わったときだけ書き換えられる太陽方向バッファであり、判定基準は「空に太陽があるか」ではなく**「スカイボックスが earth 型か否か」**である。

| スカイボックス | `l.sunDirection` |
|---|---|
| `default` (手続き空) | 非ゼロ (下記の既定値) |
| `gloomy` / `interstellar` / `space_*` (キューブテクスチャ) | **常に (0,0,0)** |

**月は常に `-sunDirection` にある** (エンジンが月の位置を太陽の正反対に計算するため)。夜の判定は太陽高度で行う — `sunDirection.y < 0` (太陽が地平線の下) のとき月が上にある。ただし既定ワールドでは太陽が静止しているため月も静止しており、動くのは昼夜サイクルを実装したワールドだけである。

既定ワールドの太陽方向は約 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 から計算される単位ベクトル、静止)。配布パックのテスト時にハイライトの方向を机上で予測できる基準値である。

昼夜サイクルはエンジンに組み込まれていない — inclination は静的な数値であり、昼夜が動くワールドはゲーム側が更新している。その更新のたびに `sunDirection` も書き換わるため追従する。

地形の方向光はシーン起動時に作られる 2 灯のみで**方向も強度も固定、昼夜で変化しない**。まとめると**地形の明るさを決める要素はどれも時間に依存しない。昼夜の「見た目」はスカイボックスと sunDirection のみ**であり、夜に地形を暗くしたいパックは sunDirection から自分で時間帯を推定する (§19 の `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −l.sunDirection

月が上にある時間だけ、青白い Lambert と弱いスペキュラを加える。`moonUp` が 0 の世界 (既定の静止太陽ワールド) では何も起きないため、**昼夜サイクルのあるワールドだけで発動する安全な月光**になる。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 月は常に太陽の正反対。昼の間は moonDir.y < 0 で自動的に消灯する
    let moonDir = -l.sunDirection;
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(l.eyePosition - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. フォグの内部仕様

フォグ計算は常に LINEAR モード (`fogFactor = (fogEnd - dist) / (fogEnd - fogStart)`、clamp 0..1) で、`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)` (D = フォグ距離設定。D = 0 のときだけ fogEnd = 5 の特例) である。**フォグの傾斜帯はわずか 32 ブロック幅**であり、`l.fogFactor` は「距離による霧」というより**「読み込み済みワールドの縁までの正規化距離」**の指標である。プレイヤーごとに読み込み距離が違うため、距離ベースの演出は自分で `distance(l.position, l.eyePosition)` を計算すべきである (レシピ R-B)。

既定のフォグ色は `rgb(183, 191, 195)` (淡い青灰色)。ワールド作成者は `fogColourOverride` (hex) で変更できる。フォグモードが 0 (NONE) の状態では **fogColour は黒で届く** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`)。`mix(l.fogColour, col, l.fogFactor)` の標準形なら fogFactor が 1 のとき霧色が使われないため安全。

プレイヤー側の `showFog` を false にするとフォグは 3200〜3328 ブロックへ追いやられ実質無効化される (fogFactor ≈ 1 が返り続ける)。

### R-B. 読み込み境界バンド — fogFactor を「ワールドの縁」として使う

読み込み境界の 32 ブロック帯だけを静かに冷色で締めて、ワールドの端を目立たなくする。距離を自分で計算しないため、プレイヤーの読み込み距離設定に自動追従するのが利点。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    // fogFactor: 1 = 内側 (境界まで余裕あり), 0 = 境界の外へ出る直前
    let edge = 1.0 - l.fogFactor;
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
- **`time` の正体は `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` であり、ブラウザの起動経過時間を 1 時間で折り返した値である。ゲーム内昼夜ともワールドの経過時間とも無関係。ゲーム内時計と同期したアニメーションを作りたい場合は、昼夜サイクル実装ワールドの `sunDirection` 方位角から推定するのが現実的である
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

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    // y が低いブロックから順に溶ける。dissolve が高いほど残る
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(s.originOffset).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水のカメラ近接フェード — 液体の alpha で見通しを確保

液体フックの `out.alpha` はブレンドに直結する。カメラ直下の水面だけを透かして、潜水・水上カメラの視界を確保するレシピ。

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, s.eyePosition);
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0〜3 ブロックで完全透明→通常
    #endif
    return out;
}
```

## 28. パックに見える値を変えるもの — テストチェックリスト

同じパックでも**ワールドとプレイヤー設定で `l.*` の中身は変わる**。配布前には少なくとも次の 3 環境で見た目を確認する:

1. **通常ワールド** (default スカイボックス・オーバーライド無し) — sunDirection あり・既定色
2. **space 系スカイボックスのワールド** — sunDirection = 0。`sunPresent` 分岐の見た目
3. **`visionMinLightColour`・`skyLightColourOverride` を設定したカスタムワールド** — 暗部と色が持ち上がるケース

主な変動源: `lightingOverride` (照明強制) / `skyLightColourOverride`・`ambientLightColourOverride` (hex 差し替え) / `visionMinLightColour` (視認最暗色の底上げ。Night Vision が使用。「洞窟を真っ暗に」系は想定より暗くならない) / `heldLightColourOverride`・`Range`・`ConeAngle` / `fogChunkDistanceOverride`・`fogColourOverride`・`fogOnSkybox` / `skyBox` (sunDirection の有無)。`uSkyLightColour` 既定 = (1,1,1) 白、`uAmbientLightColour` 既定 = (0.25,0.25,0.30)。`l.ambient` のシーン成分 = グラフィック設定「Ambient Lighting Intensity」(既定 0.5)。`l.fogFactor` はプレイヤーのフォグ/チャンク距離設定に追従。

## 29. デバッグ手段

- URL パラメータ `?renderer=lite` — Lite レンダラーを強制 (`?renderer=webgl2` / `babylon` も可)
- URL パラメータ `?vconsole` — 画面内コンソール (VConsole) 起動。モバイル実機検証で重宝する
- コンソールには `noa-engine v0.33.0` と `Renderer: lite from <ソース>` が出る — 描画パスの誤診断防止にまずこれを確認する
- WebGPU レンダラーはパック適用中「強制 ON」でロックされる。「Disable Block Texture Atlas」設定もロックされ (アトラス ON を維持)、WebGPU 非対応環境ではそもそもパックが適用できない。配布ページに「WebGPU 対応ブラウザが必要」と書く根拠はここである
- ゲーム参加毎にランタイム再検証 (`checkCompilation`) が走り、実在する全地形マテリアルで実コンパイルする (設定画面の静的検証より厳しい)。ここで落ちるとパックはそのゲームで除外される

## 30. 独立した類似資料について

本書とほぼ同じ内容の社区資料として [GlitchHunterCoder/Bloxd-Essay の Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader) が存在する。こちらは本書より先に公開されているが、**本書の内容は glm が Bloxd の本体バンドルファイル (webpack チャンク群) を実際に解析して得た情報であり、コピペなどではない**。両者が一致するのは、同じ実装を独立に調べれば同じ結論に至るためである。

---

調査: ltf_ahel (glm を使用して調査)


