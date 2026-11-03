# リアル化

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

「バニラの見た目を素材から組み直す」物理系レシピ集。v5 では `bloxdLitColour()` / `bloxdShading()` / `bloxdWorldLight()` を部品に使えます ([ライティングAPI](../api/lighting.md))。


> 「バニラの見た目を素材から組み直す」ための物理系レシピ集。前提:
>
> 1. **light フックはフラグメントの最終段で呼ばれる**。返す colour がそのまま最終色。**自分でフォグをかけ直す必要がある** (R9.10)  
> 2. **エンジン既定の照明は掛け算のみ**。スペキュラ / フレネル / 暖色-冷色分離 / 半球環境光はゼロから実装可能  
> 3. `out.colour` は完成色 (フォグ済み)。これを破棄し `s.colour` (アルベド) から再構築するのが本格的な手法  
> 4. テクスチャ使用は禁止 → ディテールはすべて**手続き的** (ハッシュ/ノイズ) で生成 (R9.8)

## R9.1 暖色トーチ × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中間 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // フォグ掛け直し
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission 再加算
}
    return out;
}
```

## R9.2 太陽スペキュラ (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
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
}
    return out;
}
```

## R9.3 Schlick フレネル

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 縁の薄い明るみ
}
    return out;
}
```

## R9.4 半球環境光 (上=空 / 下=地面の跳ね返り)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // 下: 跳ね返り
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上: 空光
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中間 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // フォグ掛け直し
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission 再加算
}
    return out;
}
```

## R9.5 ACES フィルミック (Narkowicz 近似)

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

## R9.6 大気遠近法 (距離で彩度が落ちる「空気感」)

> 注意: 霞の色に輝度を持ち上げる処理 (`normalize` 等) を適用すると、霧が暗いシーンで「明るい白い靄」が浮かび、  
> 既定の出力 (フォグ済み) にさらに霧色を加算すると二重フォグで白濁する。**空気感は彩度の低下のみで表現**するのが安全。

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

## R9.7 波法線 + 太陽グリント (水面の「太陽の道」)

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
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 手続き的マイクロバンプ (テクスチャ禁止の回避策)

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
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // ブロック内ローカル座標
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 洞窟の非線形暗化 + 灯りの保護

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // 灯りのある所は持ち上げ
        out.colour *= mix(keep, 1.0, sky * sky);     // 暗化は非線形 (2 乗)
}
    return out;
}
```

## R9.10 フォグをかけ直す定石 (既定の出力を捨てたとき必須)

> `(1.0 - l.fogAlpha)` を `min(l.fogAlpha, 0.75)` のように下限を設けることで、「これ以上濃くしない」調整が可能になる。
> (0.0 = エンジン準拠 / 0.3〜0.5 = 遠景クリア)。
> なお、エンジンのフォグは地平線専用の線形フォグ (描画距離付近のみ) であり、中距離の霧はパック側で生成する必要がある。
> 実際のフォグ設定 (実装照合済み): 線形固定 / `fogStart` = 描画チャンク距離 / `fogEnd` = +1 チャンク / フォグオフ時は 100〜101 チャンクで実質無効 / デフォルト色 RGB (183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // ← フォグ再現 (0.15=薄めの下限)
        col += s.emission * (1.0 - l.fogAlpha);            // ← emission もフォグ済みで
        out.colour = col;
}
    return out;
}
```

## R9.11 シネマ-grade (影は寒色 / ハイライトは暖色 / 夜はデサチュレート)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // 太陽方向がゼロのときだけ夜扱い。夕暮れの連続変化は表現しない
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 投影風シャドウ — リフト逆変換 + しきい値カット (決定版)

> **前提の再確認 (10章)**: `l.skyLight` は生のボクセル値 (n/15) ではなく、エンジンが「リフト曲線」  
> `y = 1-(1-x/(3-2x))³` (暗部を持ち上げる S 字カーブ) を適用した後の値である。
>
> | 場所 | ボクセル生値 | リフト後 (= l.skyLight) | pow (·, 5.0) |  
> |---|---|---|---|  
> | 開けた空 | 1.00 | 1.00 | 1.00 |  
> | 木の下 (半径2) | 0.87 | **0.97** | **0.86** ← ほぼ維持 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **これが「ガンマを上げても影が濃くならない」根本原因** (数値で証明済み)。ただし曲線は単調であるため、代数的に厳密に逆変換可能である:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。生値を復元した後は、**しきい値カット** (`smoothstep`) で二値化すればよい。  
> LightEngine の BFS 横拡散は「隣接 1 ブロック = -1」としているため、しきい値 `th = 1 - r/15` はそのまま  
> 「r ブロック以上の遮蔽を影とする」ダイヤルとなる。ブロックを破壊すれば、影も即座に更新される (LightEngine がリアルタイム再計算)。  
> 制限: 影は「上方向の空」を基準とするため、太陽の移動では回転しない (15章「影の真実」)。

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
    if (bloxdLit()) {
        // ① 生値の復元 (これを飛ばすと永久に影にならない)
        let skyRaw = sh_unlift(l.skyLight);
        // ② しきい値でカット — 日向は1、影は0と確実に分離
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // 太陽に対する Lambert 計算 (太陽がない空では l.directional にフォールバック)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // ★投影の正体: 太陽の直接光は「空が見える場所」にしか届かない
        let lit = sunL * sky;
        // 影側: 黒ではなく空色に染まり、さらに最低環境光が加算される
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // トーチ光は影を貫通する (blockLight もリフト後に復元されるため)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // フォグを再適用 (既定の出力を破棄した分を補正)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission も忘れずに (フォグ済みで加算)
}
    return out;
}
```

> 調整ガイド: **影の面積は `shTh` だけで決まる** — `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 影の縁の硬さは `shSoft` (0.02=硬い / 0.08=ソフト)。影の芯の暗さは `0.09` (最低環境光) と `0.16` (空の散乱光)  
> の 2 点シフトで決まる。夕方に影を広げたければ  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` を足す (長い夕方の影の近似。  
> `sunDir` は `bloxdSunDirection() / length(bloxdSunDirection())`)。影の青味は `vec3f(0.72, 0.82, 1.05)` の B を上げる。

[← 前の部](../api/)・[マニュアルに戻る](../)・[次の部 →](../guides/realism.md)

## 関連

- [リアル化ガイド](../guides/realism.md) — 考え方と2つの流派
- [影の表現](../guides/shadows.md) — R9.12 の背景
- [ライティングAPI](../api/lighting.md)
