# ライティング

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブヘッダーから逐語復元)

v5 はライティングAPIを公開しました。エンジンが内部でやってきたこと (`litColour` を作る照明計算) が、ヘッダー関数としてパックから呼べるようになっています。このページは照明系の入力フィールド・関数・処理順序を体系的に説明します。

## 全体の処理フロー

エンジンの light 段階のデフォルト実装 (`bloxdDefaultLight`) が示す、色の完全なチェーン:

```
surface.colour
    │  overlayColour を混合 (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  bloxdShading(light) を乗算 — 材質と角度の応答
    ▼
shaded
    │  enchantColour を混合 (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  bloxdWorldLight(light) を乗算 — ワールドの光 (block/sky/held の最明値)
    ▼
lit = bloxdLitColour(surface, light)   ← emission とフォグの「前」の色
    │  + surface.emission               ← 発光はライティング後に加算
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (最終色)
```

`bloxdLitColour()` の処理順序 (ヘッダー自身の要約: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. `overlayColour` の反映
2. `bloxdShading()` によるシェーディング
3. `enchantColour` の反映
4. `bloxdWorldLight()` によるワールド照明の適用

Emission と Fog の順序: **emission はライティングの後、フォグの前に加算**され、フォグが emission も沈めます (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`)。

## 関数

### bloxdLit() — ライティングのゲート

```wgsl
fn bloxdLit() -> bool
```

ブロック光と天空光が有効か。**無効時の保証**:

| フィールド | 無効時の値 |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (白) |

v4 の `#ifdef BLOXD_LIGHTING` は廃止。実行時の `if (!bloxdLit()) { return bloxdDefaultLight(...); }` に置き換えます。

### bloxdShading() — 材質と角度の応答

```wgsl
// How the face's material and angle light it: directional light on its
// diffuse colour, plus its emissive and ambient terms, clamped to 0-1.
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- `directional` (合算 Lambert) を `diffuse` (材質の RGB 応答) に掛け、`emissive` (材質の RGB グロー) と `ambient` (RGB 環境色) を足して 0〜1 にクランプ
- **v5 の新入力 `diffuse` / `emissive`** により、Lambert 項だけを差し替えた再構築が可能

### bloxdWorldLight() — ワールドの光

```wgsl
// The world's light at this fragment: the brightest of block, sky and held
// light, none below ambientLightColour.
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- 3系統 (ブロック光・天空光・保持光) をそれぞれ `ambientLightColour` を下限として整形し、**最も明るいもの**を採る
- `skyLight` は `ambientLightColour` から `skyLightColour` への補間を `skyLight` の強度で行う

### bloxdLitColour() — エンジンのレシピ

```wgsl
// The surface's colour lit as the engine does, before emission and fog.
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — フォグ

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = フォグなし、1 = fogColour のみ** (v4 の `fogVisibility` と意味が反転)
- `fogColour` はゲームのフォグの RGB。**フォグがないゲーム/設定では `vec3f(0.0)`**

### bloxdDefaultLight() — デフォルトの全体

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 入力フィールド (BloxdLightIn)

| フィールド | 型 | 意味 | 備考 |
|---|---|---|---|
| `litColour` | `vec3f` | 照明・エンチャント済みの RGB (emission とフォグの前) | 光源系ではなく、エンジンが計算した結果値 |
| `directional` | `f32` | 方向光の合算 Lambert 項 | 方向光がなければ 0 |
| `diffuse` | `vec3f` | 材質の方向光 RGB 応答 | v5 新設 |
| `emissive` | `vec3f` | 材質の RGB グロー (directional に加算) | v5 新設 |
| `ambient` | `vec3f` | RGB 環境色 (directional に加算) | |
| `blockLight` | `vec3f` | RGB ブロック光 | `!bloxdLit()` で 0 |
| `skyLight` | `f32` | 天空光 | `!bloxdLit()` で 1 |
| `ambientLightColour` | `vec3f` | 最小 RGB 光 (下限) | `!bloxdLit()` で 1 |
| `skyLightColour` | `vec3f` | skyLight の RGB 色 | `!bloxdLit()` で 1 |
| `heldLight` | `vec3f` | RGB 保持光 | `!bloxdLit()` または光源保持なしで 0 |
| `fogColour` | `vec3f` | ゲームの RGB フォグ色 | フォグなしで 0 |
| `fogAlpha` | `f32` | 0 = フォグなし、1 = fogColour のみ | v4 `fogVisibility` の反転 |

## 光レベルの物理 (読み飛ばし可の背景)

- **`blockLight` / `skyLight` / `heldLight` は 0〜1 にマップ済み**: 0〜15 の光レベルを ease-out カーブで写した値 (例: `6 → 0.45`、`12 → 0.92`)。3つとも `ambientLightColour` を含まない
- **リフト曲線**: `skyLight` の実体は「その場所から空が見えるか」のボクセル遮蔽データ (= 影マップ)。しきい値で日向/影を分離したい場合は逆変換が必要な場合がある ([リアル化ガイド](../guides/realism.md) 参照)
- **フォグの内部**: linear モードでは `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (0..1 クランプ)。ビュー空間距離は頂点単位で計算・補間。現行ビルドは linear 固定 (詳細は [エンジン内部: Fog Internals](../internals/fog-internals.md))

## 実装例

### カスタムシェーディング + エンジンのワールド光

v4 では `litColour` のスケーリングで近似していたレシピが正確に書ける:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    // ハーフランバートのラップ: 柔らかく、裏面で完全に暗くならない
    let nDotL = light.directional; // すでに合算済みの Lambert 項
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### エンジンのワールド光をそのままに、emission の強調だけ

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### 夜の青シフト (skyLight 駆動)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // 夜 (skyLight が低い) ほど青く
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## 関連

- 関数のシグネチャ一覧 → [関数](functions.md)
- ライティングの作り方・影・夜間の設計 → [Guides](../guides/lighting.md)
- blockLight / heldLight の内部構造、リフト曲線 → [エンジン内部: Lighting Internals](../internals/lighting-internals.md)
