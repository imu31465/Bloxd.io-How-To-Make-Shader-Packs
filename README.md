# Bloxd.io シェーダーパックの作り方 (完全版)

Bloxd.io のシェーダーパック (WebGPU レンダラー専用) を自作・配布するための単独完結の手順書。
`apiVersion: 1` 時点の仕様に基づく。レシピ集と API リファレンスを含むため、この1ファイルだけで最初から配布まで行える。

> 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる。
> シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パックは純粋な WGSL
> (JS 実行・通信不可) のため、通常の記述で危険なことは起きない。

## 目次

- [第一部: 作り方](#第一部-作り方)
- [第二部: API リファレンス](#第二部-api-リファレンス)
- [第三部: レシピ集](#第三部-レシピ集)
- [第四部: リアル化ガイド](#第四部-リアル化ガイド)
- [第五部: トラブルシューティング・注意](#第五部-トラブルシューティング注意)

---

---

# 第一部: 作り方

## 1. 概要と前提

- シェーダーパックは **WebGPU レンダラー専用**。パック導入中は設定の WebGPU レンダラーが強制オンになる
- パックは **WGSL の制限付きサブセット**で記述する。対象は**地形 (terrain) と液体 (liquid)** の見た目のみ
- できること: 色・透明度・発光の変更、照明の組み直し、(一部ゲーム限定で) 頂点移動
- できないこと: テクスチャの追加・サンプリング、ポストプロセス (ブルーム等)、影・反射の新設、空やエンティティへの適用
- **大多数のゲームは strict モード** (頂点移動・`discard` 禁止)。一般配布するパックは strict で動く作りにする

## 2. 最短手順

1. フォルダを作り、`pack.json` と `.wgsl` ファイルを置く
2. ゲームの設定 → Shader Pack から zip またはフォルダを読み込ませる
3. エラーが出たら直して再読み込み (第五部)
4. 対応ゲームで動作確認する
5. 完成したら zip に固めて配布する

## 3. パックの構成

- **配布形態**: `.zip` 1つ、またはフォルダ (フォルダ読み込みはデスクトップ版ブラウザのみ)
- **中身**: `pack.json` 1つ (パックの最上位に配置) + `.wgsl` ファイル 1〜256個
- 複数の `.wgsl` は連結されて1モジュールとして扱われるため、分割・ディレクトリ分けは自由。ファイル名に制約は無い

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

- 出力構造体は**直接構築しない** (`bloxd_Surface(...)` はエラー)。必ず `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` から作ってフィールドを書き換える
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
- フラグ定義 `#define 名前` + `#ifdef` による条件分岐

禁止・注意:

- **テクスチャ不可**: `texture_*` / `sampler` 型は使えない。質感はハッシュノイズ等の手続き的計算で作る
- **`discard` は strict で禁止** (`#ifndef BLOXD_STRICT` で囲む)
- `@属性` / `enable` / `requires` / `override` は禁止。`enable f16;` が書けないため **f16系の型は使えない**
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
3. 読み込み後はページの再読込で有効化される
4. まず制限の緩いゲームで確認し、次に strict のゲーム (大多数はこちら) で確認する。頂点移動を使う場合は allow のゲームでのみ動作する
5. 配布時は `pack.json` を最上位にした zip に固める (3章の上限内であること)

---

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

- `time` は3600秒で折り返す。`sunDirection` は太陽への単位ベクトル (夜は月方向として使える)
- `emission` は照明計算の後に加算され、その後フォグがかかる
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

---

# 第三部: レシピ集

すべての断片は8バリアントを通す前提のガード付きで書いてある。そのままコピペして定数をいじるだけで使える。

## R1. 色のレシピ (surface)

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
    return clamp(floor(c * steps + 0.5) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 照明のレシピ (light)

### コントラスト S 字カーブ

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (3.0 - 2.0 * c01), strength);
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

### 満月ライト (月方向を向いた面を持ち上げる)

```wgsl
// sunDirection は「太陽への方向」。夜は下を向く = 月方向として使える
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let moonFace = clamp(dot(l.normal, l.sunDirection), 0.0, 1.0);
    out.colour += vec3f(0.7, 0.8, 1.0) * moonFace * l.directional * 0.10;
    #endif
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
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. 発光のレシピ (emission)

> `emission` は照明計算後に加算され、その後フォグがかかる。遠景でも光らせたい成分には `fogFactor` を自分で掛ける。

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
    let world = l.position + vec3f(f32(l.originOffset));
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

> `time` は 3600 秒 (1 時間) で折り返す。「1 日の昼夜サイクル」を作るには 3600 秒を 1 周期として扱う。

### 昼夜サイクル (1 時間で 1 日)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1、1 時間周期
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
    let ripple = sin(s.time * 2.1 + s.position.x * 1.3 + s.position.z * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid は常に BLOXD_ALPHA — ガードは習慣として
    #endif
    return out;
}
```

### 浅瀬を透けさせる

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    // 水面の y が小さい = 浅い (液体は源から 7 ブロック程度と想定して調整)
    let shallow = clamp(1.0 - abs(s.position.y) * 0.25, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    out.alpha = clamp(mix(0.9, 0.45, shallow), 0.0, 1.0) * s.alpha;
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
    out.colour = s.colour * voxel;
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
    let hemi = 0.25 + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
    #endif
    return out;
}
```

### R9.5 ACES フィルミック (Narkowicz 近似)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14),
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
    let c2 = cos(p.z * 1.35 + t * 1.28 + 1.7);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let n = mix(baseN, pack_waveNormal(l.position, l.time), clamp(baseN.y * 2.0, 0.0, 1.0));
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
    let night = 1.0 - clamp(pack_luma(l.skyLightColour) * 3.0, 0.0, 1.0);
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

---

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
| 夜の月光処理 | 空色が暗くなるだけ | ◎ 月方向・彩度設計 (R2 満月ライト / R9.11) |

## 14. リアル化の実装パターン — 2つの流派

**流派 A: 加算修正 (defaultLight 起点)** — `engineColour` (完成色) を素地に、暖色グローや rim を足す。手軽で安全だが照明モデル自体は既定のまま。

**流派 B: 完全リライティング (s.colour 起点)** — `l.engineColour` を捨て、`s.colour` (アルベド) と LightIn の生素材から照明を組み直す。リアル化の本命。守るべき4点:

1. **フォグをかけ直す**: light フックは最終段 (フォグの後) なので `mix(l.fogColour, col, l.fogFactor)` を自分で適用する (R9.10)。霧が濃すぎるときは `max(l.fogFactor, 0.3)` のように下限を敷く。逆に engineColour 起点のパックで更に霧色を混ぜると二重フォグで白濁する
2. **unlit バリアントのフォールバック**: `#ifdef BLOXD_LIGHTING` の外では `defaultLight` に素通りさせる
3. **共用関数ごとガードする**: `bloxd_LightIn` を引数に取る共用関数は fn ごと `#ifdef BLOXD_LIGHTING` で囲む (呼び出し側だけでは不十分)
4. **太陽が無い場合のフォールバック**: `length(l.sunDirection) > 0.5` が偽のときは `l.directional` を使う

## 15. 到達できない表現 (リアル化の「天井」)

| 表現 | 理由 |
|---|---|
| シャドウマップ (影) | 深度テクスチャの参照不可 |
| SSAO | シーン深度にアクセスできない (AO は頂点色に焼き込まれたもののみ) |
| SSR (反射) | 同上。フレネルで空色を乗せる疑似のみ |
| ブルーム / グレア | ポストプロセスにフックが存在しない |
| 被写界深度・色収差・グレイン | フルスクリーン後処理が必要 |
| 体積光 (god rays) | 同上 |
| PBR テクスチャ | テクスチャ参照禁止。色の輝度からの擬似推定のみ |
| 水中屈折 | シーン深度の入力が無い |

## 16. デバッグのコツ

- 洞窟が明るすぎる → `skyLight` の非線形カーブが足りない (R2 洞窟レシピ / R9.9)
- 昼間が白飛びする → ACES 前の露出を下げる
- 夜が暗すぎる → 最小環境光を確保する (夜の `skyLightColour` はほぼ黒になる前提で)
- 遠景が霞みすぎる → 大気減衰の係数を下げる
- 松明の周りがオレンジだらけ → 暖色ブレンドの比率を下げる (素の色つき光を残す)

---

---

# 第五部: トラブルシューティング・注意

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む |
| `Packs can't construct bloxd_Surface directly` | `bloxd_defaultSurface(s)` を起点に書き換える |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` で囲む |
| 遠景が白く濁る | フォグの二重掛けが原因のことが多い。完成色はフォグ済みなので独自の霧色は控えめに、彩度だけ落とす方式を検討する |
| ゲーム参加時にパックが除外される | ゲーム開始時の実機チェックで失敗している。ガード漏れを見直す |

## 18. 権利・注意

- シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パック制作は想定内の行為と考えられる。ただし公式ドキュメントは現状存在しない
- パックは純粋な WGSL であり、JS 実行・ネットワークアクセスは設計上不可能
- 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる
