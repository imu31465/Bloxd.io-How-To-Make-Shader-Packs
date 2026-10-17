[← 前の部](6-implementation.md)・[マニュアルに戻る](README.md)・[次の部 →](8-apiv2.md)

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
