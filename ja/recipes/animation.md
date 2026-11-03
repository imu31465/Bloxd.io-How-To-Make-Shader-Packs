# 時間とアニメーション

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

`bloxdSeconds()` と座標を組み合わせたアニメーション部品。周期タイマーは `bloxdSeconds() % period` でも作れます。


> `bloxdSeconds()` はページ読み込みからの経過秒 (折り返さない。f32 のため最初の4.5時間はサブミリ秒精度)。これはシェーダー内の経過時間であり、ゲーム内の太陽や昼夜サイクルと同期するとは限らない。視覚的な周期アニメーションには利用できるが、実際の夜間判定には `bloxdSunDirection()` やライティング入力を優先すべきである。

## 昼夜サイクル (1 時間で 1 日)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 の1時間周期 (bloxdTau で書いてもよい)。ゲーム内の昼夜と同期するとは限らない
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## ゆらぎ (複数 sin の重ね合わせ)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## バンドが流れるオーロラ / 蛍光の帯

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
