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

[← 前の部](09-apiv3.md)・[マニュアルに戻る](README.md)
