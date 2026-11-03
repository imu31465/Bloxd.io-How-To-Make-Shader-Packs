# 座標

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

ワールド座標・ブロック座標・視線ベクトルを扱う部品集。レンダー座標系は `bloxdRenderOffset()` でワールドへ変換します。


## ワールド座標

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## ブロック座標

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));   // v5: bloxdFragmentBlockPosition は削除済み
```

## 市松模様 (ブロック単位)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 or 1
out.colour *= mix(0.96, 1.04, checker);
```

## ブロック単位の擬似ランダム (ハッシュ)

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

## 視線ベクトルとリムライト

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## 視線角度 (フレネルもどき — 液体向け)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 真上から 1 / 浅い角度 0
let fresnel = pow(1.0 - facing, 3.0);
```

## 関連

- [関数](../api/functions.md) — `bloxdWorldPosition` / `bloxdRenderOffset`
- [数式小技集](math.md)
