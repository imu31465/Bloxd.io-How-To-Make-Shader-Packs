# 照明

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

light フックで照明を組み替えるレシピ集。v5 では `bloxdLit()` / `bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()` が使えます ([ライティングAPI](../api/lighting.md))。


## コントラスト S 字カーブ

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## 距離ヘイズ (独自フォグ)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ブロックから 192 ブロックで 0..0.35 のフォグを自前で足す
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## 夜 (skyLight 駆動の青シフト + 灯りの保護)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## 洞窟を真っ暗に (skyLight が無い所を更に暗く)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` はリフト後の値 (10章) なので、浅い遮蔽 (木の下など。生値 0.87 → リフト後 0.97) はこの方法ではほとんど暗くならない。洞窟 (生値 0) には効果がある。「木陰」をはっきりさせたい場合は R9.12 のリフト逆変換 + しきい値方式を使う。

## 夜の青い環境光 (月の方向を使わない擬似表現)

> このAPIでは、空に太陽がないとき `bloxdSunDirection()` はゼロになる。以下は方向性のある月光ではなく、空が暗いときにごく弱い青い環境光を足すだけの疑似表現。なお月の方向自体は `-bloxdSunDirection()` で得られる (昼夜サイクルワールド限定 — [太陽と月の正体](../internals/sun-and-moon.md))。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## 夕暮れの暖色化 (太陽高度で色を寄せる)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平線で1/真上で0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## エンジン出力の完全置き換え (最も単純な再照明)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) の直接構築は禁止。default から作って colour を書き換える
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // 既定の照明結果を捨てて「素材の色 × 自分で計算した明るさ」に置き換える
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // 既定の出力を捨てたのでフォグをかけ直す (必須)
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission も自分で足す (必須)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
