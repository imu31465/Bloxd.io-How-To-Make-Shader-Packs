> [← マニュアルに戻る](../README.ja.md)

# 第三部: レシピ集

- [R1. 色のレシピ (surface)](#r1-色のレシピ-surface)
- [R2. 照明のレシピ (light)](#r2-照明のレシピ-light)
- [R3. 発光のレシピ (emission)](#r3-発光のレシピ-emission)
- [R4. 座標のレシピ (ワールド/ブロック/視線)](#r4-座標のレシピ-ワールドブロック視線)
- [R5. 時間のレシピ (アニメーション)](#r5-時間のレシピ-アニメーション)
- [R6. 液体のレシピ](#r6-液体のレシピ)
- [R7. 頂点のレシピ (allow 限定)](#r7-頂点のレシピ-allow-限定)
- [R8. 数式小技集](#r8-数式小技集)
- [R9. リアル系レシピ](#r9-リアル系レシピ)

---

すべての断片は8バリアントを通す前提のガード付きで書いてある。そのままコピペして定数をいじるだけで使える。

## R1. 色のレシピ (surface)

> **重要:** 以下のレシピは個別の例であり、上からすべて連結する用途ではない。同じフック名 (`bloxdTerrainLight` など) や同じヘルパー関数名を複数貼ると、同一モジュール内で定義が重複してコンパイルに失敗する。複数の効果を使う場合は、フックを各種類1つにまとめ、処理をその関数内へ統合する。

### 単色ティント (最も基本)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 で 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 面の向きで塗り分け (上向き=明るく、壁=暗く)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ブロックから 192 ブロックで 0..0.35 のフォグを自前で足す
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜 (skyLight 駆動の青シフト + 灯りの保護)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> このAPIでは、空に太陽がないとき `bloxdSunDirection()` はゼロになる。以下は方向性のある月光ではなく、空が暗いときにごく弱い青い環境光を足すだけの疑似表現。なお月の方向自体は `-bloxdSunDirection()` で得られる (昼夜サイクルワールド限定。第七部 R-A)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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

### エンジン出力の完全置き換え (最も単純な再照明)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) の直接構築は禁止。default から作って colour を書き換える
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (エンジンの照明結果) を捨てて「素材の色 × 自分で計算した明るさ」に置き換える
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour を捨てたのでフォグをかけ直す (必須)
    out.colour = col + s.emission * l.fogVisibility;   // emission も自分で足す (必須)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 発光のレシピ (emission)

> `emission` は照明計算後に加算されるが、既定処理では **`fogVisibility` が掛かって減衰する。つまり完全に霧に沈む遠景では emission も消える。遠景でも光らせたい成分は emission に足さず、light フック内で `out.colour += ...` として直接加算する** (engineColour はフォグ済みなので、遠景では霧色の上に光が乗る)

### 灯りの脈動 (松明が息をする)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 発光鉱石っぽい処理 (明るい素材を光らせる)

```wgsl
// surface 側: 素材が明るい (白い) ほど emission を盛る
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 蛍の群れもどき (時間で空間を漂う光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数個の「光の玉」がゆっくり移動する。distance の逆数で光らせる
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 座標のレシピ (ワールド/ブロック/視線)

### ワールド座標

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### ブロック座標

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
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
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 視線角度 (フレネルもどき — 液体向け)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 真上から 1 / 浅い角度 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 時間のレシピ (アニメーション)

> `bloxdTime()` は 3600 秒 (1 時間) で折り返す。ただしこれはシェーダーの経過時間であり、ゲーム内の太陽・昼夜と同期する保証はない。見た目の周期アニメーションには使えるが、実際の夜判定には `bloxdSunDirection()` や照明入力を優先する。

### 昼夜サイクル (1 時間で 1 日)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 の1時間周期。ゲーム内の昼夜と同期するとは限らない
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
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid は常に BLOXD_ALPHA — ガードは習慣として
    #endif
    return out;
}
```

### 高度を使った透明度の疑似変化 (本当の浅瀬判定ではない)

> v1 ではシーン深度や水底の位置を参照できず、このAPIだけでは実際の水深を計算できなかった。v2 では液体限定で `bloxdOpaqueBehind()` により奥の不透明面までの厚みが測れる (第八部 R-E)。以下はそれを使わない旧来の疑似演出で、`s.position.y` はローカル座標なので、そのまま使うと座標原点の変化で効果がずれる。ワールド高度を使う場合は `bloxdWorldPosition()` で変換する。以下はワールド高度を使ってアルファを変えるだけの疑似演出で、海岸線や水底に沿った浅瀬表現ではない。`packWaterReferenceY` はワールド高度に合わせて調整する。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 垂直面のみ
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面の波 (上面のみ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脈動する地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 法線方向にわずかに膨張収縮
    return out;
}
#endif
```

### 波打つ地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // フォグ掛け直し
    out.colour = col + s.emission * l.fogVisibility;                 // emission 再加算
    #endif
    return out;
}
```

### R9.2 太陽スペキュラ (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 縁の薄い明るみ
    #endif
    return out;
}
```

### R9.4 半球環境光 (上=空 / 下=地面の跳ね返り)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下: 跳ね返り
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上: 空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中間 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // フォグ掛け直し
    out.colour = col + s.emission * l.fogVisibility;                        // emission 再加算
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 露出
    return out;
}
```

### R9.6 大気遠近法 (距離で彩度が落ちる「空気感」)

> 注意: 霞の色に輝度を持ち上げる処理 (`normalize` 等) を掛けると、霧の色が暗い場面で「明るい白い靄」が浮き、  
> engineColour (フォグ済み) の上にさらに霧色を混ぜると二重フォグで白濁する。**空気感は彩度だけを落とす**のが安全。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ブロック内ローカル座標
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> `l.fogVisibility` を `max(l.fogVisibility, 0.25)` のように下限付きにすると「これ以上濃くならない」調整ができる
> (0.0 = エンジン準拠 / 0.3〜0.5 = 遠景クリア)。
> なおエンジンのフォグは地平線専用のlinearフォグ (描画距離付近のみ) であり、中距離の霧はパック側で作る必要がある。
> 実フォグ設定 (実装照合済み): linear 固定 / `fogStart` = 描画チャンク距離 / `fogEnd` = +1 チャンク / フォグオフ時は 100〜101 チャンクで実質無効 / 既定色 RGB(183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // ← フォグ再現 (0.15=薄めの下限)
    col += s.emission * l.fogVisibility;            // ← emission もフォグ済みで
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 シネマ-grade (影は寒色 / ハイライトは暖色 / 夜はデサチュレート)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 生値復元 (これを飛ばすと永久に影にならない)
    let skyRaw = sh_unlift(l.skyLight);
    // ② しきい値カット — 日向=1 / 影=0 を確実に分離できる
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太陽 Lambert (太陽が無い空では l.directional にフォールバック)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission も忘れずに (フォグ済みで加算)
    #endif
    return out;
}
```

> 調整ガイド: **影の面積は `shTh` だけで決まる** — `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 影の縁の硬さは `shSoft` (0.02=硬い / 0.08=ソフト)。影の芯の暗さは `0.09` (最低環境光) と `0.16` (空の散乱光)  
> の 2 点シフトで決まる。夕方に影を広げたければ  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` を足す (長い夕方の影の近似。  
> `sunDir` は `bloxdSunDirection() / length(bloxdSunDirection())`)。影の青味は `vec3f(0.72, 0.82, 1.05)` の B を上げる。
>
> ⚠️ 「`pow(skyLight, γ)` でコントラストを深く」は**リフト後の値に gamma を掛けていた**ため  