# 定数

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブヘッダーから逐語復元)

ヘッダーが提供する定数は3つです (テクスチャ名定数 `bloxdTextureId*` は [テクスチャAPI](texture-api.md) を参照)。

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| 定数 | 型 | 値 | 説明 |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | 円周率 |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (周期計算に便利) |
| `bloxdChunkSize` | `i32` | 32 | チャンクの1辺のブロック数 |

## 使い方

### bloxdPi / bloxdTau

`const` として宣言済みのため、自分で円周率を定義する必要はありません。周期アニメーションに `bloxdTau` が便利です:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

以前はエンジン側のマジックナンバーだった「チャンクは 32 ブロック角」が、分岐に使える名前付き定数になりました。チャンク周期の効果 (市松模様、チャンク境界の演出) に使えます:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    // ワールド座標をチャンク座標に写す
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    // チャンク (x+z) の偶奇で微妙に明るさを変える (デバッグ可視化にも使える)
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

注意: `bloxdChunkSize` は `i32` です。`f32` との演算には `f32(bloxdChunkSize)` の変換を使います。

## 関連

- 定数以外のヘッダー関数 → [関数](functions.md)
- v3 で `bloxdPi` / `bloxdTau` が導入された経緯 → [バージョン履歴: v3](../history/v3.md)
