# レンダリングパイプライン

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

alphaTest の位置、方位光 2 灯構成、uniform の実体、greedy meshing と頂点フォーマット。


- **surface フックは alphaTest の「手前」で動く**: `out.alpha` がそのまま discard 判定に使われる。カットアウトマテリアル (草・葉など) ではディザパターンで溶けるようなエフェクトが作れる (レシピ R-C)。液体 (ブレンド描画) では `out.alpha` が実際の透明度になる (レシピ R-D)。通常の不透明地形では alpha は最終的に無視される
- **`l.ambient` の中身**は `material.ambient × sceneAmbient` でマテリアルごとに異なる値である。シーン側はグラフィック設定「Ambient Lighting Intensity」(既定 0.5) に直結しているため、既定値の決め打ちをしないこと
- **シーンの方位光は 2 灯構成**: 主光 (方向はスカイ設定の太陽位置に由来・強度 1.0) とフィル光 (方向 `[-0.5, -1, -1]`・強度 0.35) の Lambert 和が `l.directional` に届く。フィル光は方向が下向きのため天面には寄与せず、下向きの面 (洞窟の天井など) を拾う。地形が考慮するのは `_initScene` で追加された灯のみで、起動後にシーンへ追加した灯は地形・ブロックモデルから無視される (公式の警告文言がある)
- **`bloxdSeconds()` の正体はページ読み込みからの経過秒** (v2 では `performance.now() / 1e3 % 3600` と1時間で折り返していたが、v3 以降の `seconds` uniform スロットは折り返さない)。ゲーム内昼夜ともワールドの経過時間とも無関係。ゲーム内時計と同期したアニメーションを作りたい場合は、昼夜サイクル実装ワールドの `bloxdSunDirection()` 方位角から推定するのが現実的である
- **ヘッダ関数の実体は 1 本の uniform**: エンジンは `@group(3) @binding(0)` に 64 バイトの uniform `bloxdPackInputs` (v5 では seconds / **lit (u32、新設)** / renderOffset / sunDirection / eyePosition の 5 スロット・little-endian) を置いており、`bloxdSeconds()`・`bloxdLit()`・`bloxdRenderOffset()`・`bloxdSunDirection()`・`bloxdEyePosition()` は各スロットの読み出しに相当する ([パック形式](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))。パックからこの uniform を書き換えることはできず、パックとエンジンの WGSL は同一モジュールに合成されるため、同じ group/binding を自分で宣言することもできない。`@group(3) @binding(1)` には liquid 用の scene-depth テクスチャ、`@binding(2)` には `bloxdSpTextureLayers` ストレージバッファが来る
- **頂点データはメッシャー (Web Worker) が作る**: ブロックの地形を 1 頂点 28 バイト (アトラスありは 32 バイト) のインターリーブで整え、位置 = float32×3 / 法線 = 8bit 信号整数×4 / 色 = 8bit 準整数×4 (`s.colour` の実体 — tint × AO がメッシャーの時点で 8bit に焼き込まれ、パックから分離・復元は原理的に不可) / UV = float32×2 / atlasIndex = float32。ライトレベルだけは独立した 4 バイト頂点バッファで運ばれる ([blockLight の内部構造](lighting-internals.md))。頂点はチャンク単位の instancing で描かれる
- チャンク読み込み時の「細かい市松模様」はエンジンの画面空間 Bayer 4×4 ディザによるチャンクフェードであり、パック由来のバグではない (グラフィック設定の `chunkFadeIn` をオフにすると無効化できる)
- **`mod` は予約語**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` で拒否される。剰余は `%` 演算子で書く

## Bayer ディザ溶解 — out.alpha が discard を制御する — out.alpha が discard を制御する

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## 水のカメラ近接フェード — 液体の alpha で見通しを確保する — 液体の alpha で見通しを確保

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

## 関連

- [パック形式](../api/pack-format.md)
- [エンジンデータ台帳](engine-data.md)
- [シェーダー検証の内部](shader-validation.md)
