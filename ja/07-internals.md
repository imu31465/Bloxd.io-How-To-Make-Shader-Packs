[← 前の部](06-implementation.md)・[マニュアルに戻る](README.md)・[次の部 →](08-apiv2.md)

# 第七部: 内部仕様の補足

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

既定のフォグ色は `rgb(181, 191, 195)` (淡い青灰色)。ワールド作成者は `fogColourOverride` (hex) で変更できる。フォグモードが 0 (NONE) の状態では **fogColour は黒で届く** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`)。`mix(l.fogColour, col, l.fogVisibility)` の標準形なら fogVisibility が 1 のとき霧色が使われないため安全。スクリプト API 側には他に `fogChunkDistanceOverride` と `fogOnSkybox` のオプションがあり、カスタムゲームはフォグ距離 (D に相当する値) とスカイボックスへのフォグ適用を個別に設定できる。既定ではスカイボックスはフォグの影響を受けない (`fogOnSkybox` を有効にしたゲームでのみ、スカイボックスもフォグ色で染まる)。

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

照明の合成は加算ではない。エンジン内部では、35% 床を敷いたブロック光と `mix(アンビエント色, スカイ色, skyLight)` で作った空光の **max** を取り、手持ち光 (アンビエントブースト適用後) をさらに max で上乗せする。この合成に使われるチャンネル値は生値 (リフト前) であり、フック入力に届くリフト後の値とは別物である。したがって `blockLight` と `skyLight` は互いに打ち消し合わず、暗い側の寄与は捨てられる — 空光を弱めてもブロック光が支配的な箇所はほとんど暗くならない。露出や減衰のレシピはこの構造を踏まえて設計する ([第六部](06-implementation.md) §19 の局所光保護はこの構造への補償である)。

手持ち光 (`heldLight`) は範囲が光色の最も明るいチャンネル値 (最大 15 ブロック) で決まり、距離に `dist^0.75` の前処理が入る。blockLight と同じ 35% チャンネル床が適用され、`l.heldLight` はアンビエントブースト**前**の値である。カスタムアイテムには `spotlightRange` (射程) と円錐角を設定でき、円錐光の位置はカメラに追従する。パック側からビーム方向を知る手段は無い。

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

- 根拠ビルド: `szby6g.main.94a7596c.js` (2026-10-17 時点の本番デプロイ)。全 111 ゲーム定義を静的解析した結果、**allow 26 エントリ (12 タイトル) / strict 85 エントリ**。
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
