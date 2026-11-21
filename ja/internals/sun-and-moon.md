# 太陽と月

> 対象API: 5 · 種別: 技術資料

太陽方向の取得方法と、月の位置・昼夜サイクルとの関係を説明する。


`bloxdSunDirection()` が参照する太陽方向バッファは、スカイボックスの種類が変わったときだけ更新される。判定条件は「空に太陽が見えるか」ではなく、**スカイボックスが `earth` 型かどうか**である。

| スカイボックス | `bloxdSunDirection()` |
|---|---|
| `default` (プロシージャルスカイ) | 非ゼロ (後述の既定値) |
| `gloomy` / `interstellar` / `space_*` (キューブテクスチャ) | **常に (0,0,0)** |

**月の方向は常に `-bloxdSunDirection()` で表される** (エンジンが月を太陽の真逆に配置するため)。夜かどうかは太陽の高度で判定され、`bloxdSunDirection().y < 0` (太陽が地平線より下) なら月が地平線上にある。ただし、既定ワールドでは太陽が固定されているため月も動かない。月が移動するのは、昼夜サイクルを実装したワールドだけである。

既定ワールドの太陽方向は約 `(-0.56, 0.81, -0.18)` (傾斜角 = −0.2 / 方位角 = 0.55 から算出した静止した単位ベクトル) である。配布用パックをテストするときに、ハイライトの向きを見積もる目安として使える。

エンジン自体に昼夜サイクルはない。傾斜角は固定値で、昼夜サイクルを持つワールドではゲーム側がその値を更新する。`bloxdSunDirection()` も更新に追従する。

地形を照らす方向光はシーン開始時に作られる2灯だけで、**方向も強度も昼夜を通して変わらない**。つまり、地形の明るさは時間帯に左右されない。昼夜の見た目を決めるのはスカイボックスと `bloxdSunDirection()` だけなので、夜に地形を暗くしたいパックは `bloxdSunDirection()` から時間帯を推定する必要がある ([夜間表現の設計](../guides/night.md) の `sunPresent` 手法)。

## R-A. 月光を加える

月が地平線上にある間だけ、青白いランバート反射と弱いスペキュラ反射を加える。`moonUp` は太陽が固定された既定ワールドでは 0 になるため、そこでは何も変化しない。**昼夜サイクルを実装したワールドでのみ有効になる月光効果**である。

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
