# テクスチャAPI

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Verified (v4 から不変のAPIを v5 ビルドで再確認)

v4 で導入され v5 でもそのまま使える、ブロックテクスチャアトラスを読むAPIです。関数2種 + 名前付き定数ファミリー + 入力フィールド4個で構成されます。ヘッダー自身の一行要約: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **引数**: テクスチャ ID、uv (0〜1)、ミップレベル
- **戻り値**: `vec4f` のテクセル色
- **使用可能なフック**: **Surface / Light のみ** (vertex フックから到達すると "reaches" 診断で拒否)

ブロックテクスチャアトラスを**エンジン自身のサンプラと完全に同じ方法**でサンプリングします — 同じ `texture_2d_array<f32>` アトラス、同じサンプラ、`round(mipLevel)` での `textureSampleLevel` — したがって自分が読んだテクセルとエンジンが描画したテクセルは構造的に一致します。

セマンティクス:

- **`textureId == 0` は `vec4f(1.0)` (白) を返す。** これが「テクスチャなし」の id です。テクスチャを持たない面では4つの入力フィールドも 0 を運ぶため、`bloxdTexel(surface.textureId, ...)` は常に安全に呼べる
- **アニメーションテクスチャは自動で現在フレームを返す。** フレームはゲームのアニメーションクロックで進み、停めたりステップしたりはできません。アニメーションテクスチャの id をサンプリングすることが*生きたフレーム*のサンプリングです
- **`mipLevel` はエンジン自身と同じ方式でクランプされる**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`。範囲外の mip はエラーではなく飽和
- **現在のフラグメントの `textureRotation` が渡した uv に適用される** (下記「回転の繊細さ」)

`textureId` は**1 起点**: `bloxdTextureIdGrassTop` が id であり、エンジンがサンプリングするアトラスレイヤは `id - 1` です。id はアトラス配置ではなくテクスチャ**名**に対して安定 — エンジンはビルドをまたいでアトラスを自由に再配置しますが、名前定数の比較は「このテクスチャ」という意味を保ち続けます。

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **引数**: ミップレベル
- **戻り値**: その mip でのアトラス (= 1テクスチャ) のテクセルサイズ
- **使用可能なフック**: Surface / Light のみ

`textureDimensions(textureAtlas0, <クランプ済み mip>)`。各テクスチャはアトラスの配列レイヤ1枚を占めるため、これは*mip レベルにおける任意の1テクスチャのサイズ*でもあります (1アトラス階層内の全ブロックテクスチャは同じ正方形サイズ)。

```wgsl
// この面のテクスチャをテクセル整列で再サンプルする「ドット絵」スタイル
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## モデル独自のテクスチャ (textureId: 0)

**`bloxdTexel()` はモデル独自のテクスチャも読み取れます** — その代表が `textureId: 0` です:

- **プレイヤーのスキン**をはじめ、Mob などアトラス外のテクスチャを持つモデルは `textureId: 0` を使います
- ヘッダーの注記: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — モデルの多くはアトラスを経由しません
- `textureId: 0` を `bloxdTexel()` に渡すと `vec4f(1.0)` (白) が返るため、エラーにはなりません。モデル面で「アトラスのテクスチャを読む」コードは、`textureId != 0u` の場合にのみ効果を発揮します:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // アトラス内テクスチャを持つ面 (ブロックモデル) にだけ効く
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **プレイヤースキン/Mobテクスチャと通常のアトラスの違い**: アトラスは「ブロックテクスチャの名前→レイヤ」の辞書で、`bloxdTextureId*` で比較できます。モデル独自のテクスチャ (スキン等) は名前空間に登録されておらず、ID 0 という「テクスチャなし」表現で届きます。`surface.colour` には既にスキンのテクスチャ×色が反映済みのため、通常はそれを加工する形で使います
- **`bloxdTextureSize()` との関係**: モデル面で `textureId: 0` でも `bloxdTextureSize()` はアトラスのサイズを返します (モデルテクスチャのサイズではありません)

## bloxdTextureId*: テクスチャ名定数

利用可能な全テクスチャ名が比較可能な `const` になります。**綴りはテクスチャのファイル名を CamelCase 化したもの**:

| テクスチャファイル | 定数 | 備考 |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | エンジン自身のサンプル例 |
| `lava0.png` (フレーム `lava0`〜`lava7`) | `bloxdTextureIdLava` | アニメーション族: フレーム接尾辞は正規名から落ちる |
| `black_portal0.png` (フレーム 0〜3) | `bloxdTextureIdBlackPortal` | 同じ規則 |
| `radar_screen0` (回転コピー `[rot[1`〜`[rot[4`) | `bloxdTextureIdRadarScreen0` | 回転族: ルート名に畳み込まれる |

### 綴り規則と命名の自由度

- **生成規則** (バリデータから復元): 名前を非英数字の連続で分割し、各部分を頭文字大文字化し、`bloxdTextureId` 接頭辞の後に連結する
- **大小文字・アンダースコアは区別されない**: 逆方向の照合 (パックが書いた名前 → レジストリ名) は照合前にエンジン自身が同じ折り畳みを自分の綴りにも適用するため、例えば `bloxdTextureIdGrassTop` と `bloxdTextureId_grass_top` は**同一の定数**に解決されます
- **アニメーションテクスチャはフレーム番号を付けない**: `lava` が名前であり、`lava0` は専用エラーになる (「フレーム名はアニメーションテクスチャ Z のフレームを指す。bloxdTexel がアニメーションする bloxdTextureIdZ を使え」のメッセージが出る)
- **回転族もルート名を使う**: 回転コピーの名前を書くと専用メッセージが出る

### 名前解決のエラーメッセージ (バリデータから逐語)

> **接頭辞の綴り間違い / 大小文字違い:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **アニメーションテクスチャのフレーム:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **回転コピー:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **折り畳み後に曖昧:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **未発見 (提案つき):** `There's no texture called X. Did you mean bloxdTextureIdY?` — 提案の閾値はレーベンシュタイン距離 `max(2, floor(len/4)) + 1` (v5 で追加されたスペル補正エンジン)
>
> **未発見 (提案なし):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

### 参照した定数だけが出力される

ヘッダーの `bloxdTextureId*` ブロックは、パックが実際に参照した名前から**パック毎に生成**されます。3個の定数を使うパックの先頭には3行の `const` が付くのであって、約900行ではありません。

## 入力フィールド

`BloxdSurfaceIn` / `BloxdLightIn` のテクスチャ関連4フィールド:

| フィールド | 型 | 説明 |
|---|---|---|
| `textureId` | `u32` | この面のテクスチャ。`bloxdTextureId*` と比較。テクスチャなし = 0 |
| `textureRotation` | `u32` | 時計回りの四半回転数 (0〜3)。`bloxdTexel` が適用する |
| `uv` | `vec2f` | テクスチャが 0〜1 に広がる。`fract(uv)` が描画される |
| `mipLevel` | `f32` | ミップレベル。0 = フルサイズ、1 = 半分… |

## 回転の繊細さ — 中立サンプリングヘルパー

`bloxdTexel` は渡された uv を**現在のフラグメントの** `textureRotation` で逆回転します — 渡した id が何であっても。よくある2ケース:

- **この面自身のテクスチャを再サンプリング**する場合に `surface.uv` を渡す — uv は面の回転済み座標系にあり、逆回転がアトラス座標系へ変換し、正しいテクセルが得られる。これが意図された主用途
- **別のテクスチャ**をアトラス基準の uv でサンプリングする場合で、面の回転が 0 でないとき — 逆回転が発動し、サンプルは回転した位置に着地する。これが罠

エンジンはテクスチャ毎の回転を参照できず (回転は面のジオメトリデータ)、常にフラグメントの値を使います。別テクスチャを回転中立にサンプルするには、uv を同じ四半回転だけ事前に回転して相殺します:

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

(`textureRotation == 0` なら補正は不要。実際にはほとんどの面は 0 を持ちますが、配布パックはそれを前提にしてはいけません。)

## 実働例

### テクセル輝度からの emission

面の mip より1つ上をサンプリングして、距離に強いソフトでブロック的な平均を得ます:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // +1 mip = 1/4 解像度: 4x4 テクセルの平均。安価で安定
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        // エンジンの見た目を保ちつつ、テクスチャ自身に比例した穏やかな発光源を追加
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### テクスチャ特化の効果

`textureId` を比較して選別されたテクスチャだけに作用します (例: 鉱石をきらめかせる正規の方法):

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

### 被写界風の距離ブラー

遠くは高 mip、近くはネイティブ mip を読みます:

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

(比率トリックはエンジンの `colour = texture × tint × AO` を保存します: ブレンド済みテクセルをネイティブテクセルで割るとテクスチャ内容が打ち消され、`surface.colour` に掛け戻すブラー係数だけが残る。白 `vec4f(1.0)` の読み — テクスチャなしの面 — ではガードが効果全体をスキップする。)

## テクスチャAPIが届かない場所

- **バーテックスフックからは呼べない。** `bloxdTexel` / `bloxdTextureSize` は surface/light フックの関数であり、バーテックスフックから到達すると "reaches" 診断で拒否される
- **テクスチャを追加することはできない。** アトラスはエンジンのもの。API はそれを読むだけ。カスタムテクスチャはテクスチャパック機構の仕事のまま
- **非アトラスのレンダラ構成ではスタブに劣化する。** 地形マテリアルがアトラス方式でない構成では、エンジンは `bloxdTextureSize() -> vec2u(1u)` と `bloxdTexel(...) -> vec4f(1.0)` をコンパイルし、4つの入力フィールドは `0u, 0u, vec2f(0.0), 0.0` を流す。実アトラス向けに書いたコードはそこでもコンパイルも実行も通る — ただ白いテクセルと 1×1 のサイズを見るだけ。`textureId == 0` を許容するように書いたコードはこれも許容する

## 関連

- **利用可能896名の全一覧** → [テクスチャカタログ](texture-catalog.md)
- レジストリの内部 (畳み込み規則、ドリフト) → [Engine Internals: Texture Registry](../internals/texture-registry.md)
- サンプリングの生成コード → [Engine Internals: Texture Sampling](../internals/texture-sampling.md)
