# レンダリングパイプライン

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05, 本番) · 検証状況: Analyzed (本番バンドルの JavaScript 解析)
- **surface フックは alphaTest の「手前」で動く**: `out.alpha` が discard 判定に直接渡されます。カットアウトマテリアル (草・葉) ではディザ式の溶解エフェクトが作れます (レシピ R-C)。液体 (ブレンド描画) では `out.alpha` が実際の透明度になります (レシピ R-D)。通常の不透明テレインには影響しません — 誤解しないこと
- **`l.ambient` の中身**は `material.ambient × sceneAmbient` で、マテリアルごとに異なります。シーン側はグラフィック設定「Ambient Lighting Intensity」(既定 0.5) に直結しているため、既定値を決め打ちしないこと
- **シーンの方位光は 2 灯構成**: 主光 (方向はスカイ設定の太陽位置に由来、強度 1.0) とフィル光 (方向 `[-0.5, -1, -1]`、強度 0.35) の Lambert 和が `l.directional` に届きます。フィル光は下向きのため天面には寄与せず、下向きの面 (洞窟の天井など) を拾います。テレインが考慮するのは `_initScene` で追加された光のみで、起動後にシーンへ追加された光はテレインとブロックモデルから無視されます (公式の警告メッセージがそう述べています)
- **`bloxdSeconds()` の正体は `performance.now()`**: ブラウザの稼働時間を 1 時間で折り返したものです。ゲーム内の昼夜やワールドの経過時間とは無関係です。ゲームの時計に同期したアニメーションを作るには、昼夜サイクルのあるワールドで `bloxdSunDirection()` の方位角から時刻を推定します
- **ヘッダー関数は 1 つの uniform を読む**: エンジンは 64 バイトの uniform `bloxdPackInputs` を `@group(3) @binding(0)` に置いており (5 スロット — seconds / lit / renderOffset / sunDirection / eyePosition、little-endian)、`bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` はこれらのスロットの読み出しに相当します ([パック形式: フレームごとの uniform](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))。パックからこの uniform を書き込むことはできず、パックとエンジンの WGSL は単一モジュールに合成されるため、同じ group/binding を自分で宣言することも不可能です。`@group(3) @binding(1)` には液体用の scene-depth テクスチャ、`@binding(2)` には `bloxdSpTextureLayers` ストレージバッファが来ます
- **頂点データはメッシャー (Web Worker) が構築する**: ブロックのテレインは 1 頂点 28 バイト (アトラス有効時は 32 バイト) のインターリーブで並べられます — position = float32×3 / normal = 符号付き 8bit 整数×4 / colour = 正規化 8bit 整数×4 (`s.colour` の実体 — tint × AO がメッシャー段階で 8bit に焼き込まれるため、パック側で分離・復元するのは原理的に不可能です) / UV = float32×2 / atlasIndex = float32。ライトレベルだけは別個の 4 バイト頂点バッファで運ばれます (実測値: [エンジンデータ台帳](engine-data.md))。頂点はチャンク単位の instancing で描かれます
- ロード時のチャンク境界に見える細かい市松模様は、エンジンの画面空間 Bayer 4×4 ディザによるチャンクフェードであり、パックのバグではありません (グラフィック設定 `chunkFadeIn` で無効化できます)
- **`mod` は予約語**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` で拒否されます。剰余は `%` 演算子で書いてください

## R-C. Bayer ディザ溶解 — out.alpha が discard を制御する

エンジンがチャンクフェードに使っているのと**同じ Bayer 4×4 テーブル**を再現し、低いブロックから上へ向かって cutout を溶かします。alphaTest マテリアル (草・葉) では discard が発生し、液体ではブレンドの透明度になります。

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
    // 低いブロックから順に溶解する。dissolve が高いほど残る
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. カメラ近傍の水フェード — 液体 alpha で視界を確保

液体フックの `out.alpha` はブレンドに直接反映されます。カメラ直下の水面だけをフェードさせ、潜水時・水上カメラの視界を確保します。

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
