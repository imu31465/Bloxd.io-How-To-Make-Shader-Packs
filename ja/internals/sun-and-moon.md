# 太陽と月の正体

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

`bloxdSunDirection()` の供給元と、昼夜サイクルの実像。


`bloxdSunDirection()` の供給元は、スカイボックスの種類が変更されたときにのみ更新される太陽方向バッファであり、判定基準は「空に太陽が存在するか」ではなく**「スカイボックスが earth 型かどうか」**である。

| スカイボックス | `bloxdSunDirection()` |
|---|---|
| `default` (プロシージャルスカイ) | 非ゼロ (後述の既定値) |
| `gloomy` / `interstellar` / `space_*` (キューブテクスチャ) | **常に (0,0,0)** |

**月は常に `-bloxdSunDirection()` の位置にある** (エンジンが月の位置を太陽の真逆に計算するため)。夜の判定は太陽高度によって行われる — `bloxdSunDirection().y < 0` (太陽が地平線より下) の場合、月が上に存在する。ただし、既定ワールドでは太陽が静止しているため月も静止しており、動くのは昼夜サイクルを実装したワールドのみである。

既定ワールドにおける太陽方向は約 `(-0.56, 0.81, -0.18)` (傾斜角 = −0.2 / 方位角 = 0.55 から算出される単位ベクトル、静止) であり、配布パックのテスト時にハイライトの向きを机上で予測するための基準値となる。

昼夜サイクルはエンジンに組み込まれていない — 傾斜角は静的な数値であり、昼夜が動くワールドはゲーム側が更新を行っている。その更新のたびに `bloxdSunDirection()` も更新されるため、それに追従する形となる。

地形の方向光はシーン起動時に作られる 2 灯のみで**方向も強度も固定、昼夜で変化しない**。まとめると**地形の明るさを決める要素はどれも時間に依存しない。昼夜の「見た目」はスカイボックスと bloxdSunDirection() のみ**であり、夜に地形を暗くしたいパックは bloxdSunDirection() から自分で時間帯を推定する ([夜間表現の設計](../guides/night.md) の `sunPresent` 手法)。

## 方向性月光 — moonDir = −bloxdSunDirection() — moonDir = −bloxdSunDirection()

月が上にある時間に限り、青白いランバート反射と弱めのスペキュラが加算される。`moonUp` が 0 の世界 (既定の静止太陽ワールド) では何も発生しないため、**昼夜サイクルのあるワールドでのみ有効となる安全な月光**となる。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
if (bloxdLit()) {
        // 月はつねに太陽の正反対に位置する。昼間は moonDir.y < 0 となり、自動的に消灯する。
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
}
    return out;
}
```
