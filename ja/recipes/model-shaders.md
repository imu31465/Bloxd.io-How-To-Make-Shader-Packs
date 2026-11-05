# モデルシェーダー

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Analyzed (実装は v5 ヘッダー仕様に基づく)

v5 の Model フックと新しいフラグで、**旧バージョンでは不可能だった「何を見ているか」の判別を使ったレシピ集**です。モデルパイプラインの基礎は [モデルの描画とテクスチャ](../guides/models.md) を参照。

## 保持アイテムの微発光

v1 から一人称シェーダー作者が欲しがり続けたものが2行で:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // ローカルプレイヤーが持っているものだけを明るく、他は何もしない。
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 世界と手元で処理を分ける

エンティティと保持アイテムで別の効果を:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // 世界のエンティティを微妙に持ち上げ、手は除外
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 剣の刃先を光らせる (localPosition)

`localPosition` はモデルと一緒に回る座標 — 世界空間の当て推量なしで「モデルのどこにいるか」が分かります:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        // 保持アイテムの「上端」(モデル空間 y が高いほど) が発光 — 刃先きらめきの擬似表現
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

注意: `localPosition` の実際の範囲はモデルごとに異なります。配布前に実機で確認し、`clamp` で外れ値に強くしておくのが安全です。

## ドロップアイテムを目立たせる

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        // 落ちているアイテムは浮遊感のある脈動で視認性を上げる
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## プレイヤースキンの寒色リム (lifeform)

モデルの多くは `textureId: 0` (スキン等)。`surface.colour` に既に反映済みのため、それを加工します:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        // エンティティに薄い冷色リム — 視線角度で縁が光る
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## ブロックモデル (植物) を風に揺らす (allow 限定)

植物 (`flags.flat`) はモデルとして描かれるため、揺れは vertex フックで:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        // モデルローカルの上端ほど大きく揺らす — 草・花のしなり
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(植生は `flags.vegetation` でも判定できます。`flat` は「交差平面として描かれる」ことを、`vegetation` は「植物であること」を表します — 草・花は両方 true です。)

## アトラス内テクスチャを持つモデル面だけの加工

ブロックモデル (スラブ・階段等) の面はアトラスの `textureId` を持ちます。`textureId != 0u` で選別:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // アトラス内テクスチャを持つ面 (ブロックモデル) にだけ効く
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` の面 (スキン等) では `bloxdTexel` は白 `vec4f(1.0)` を返すため、エラーにはなりません ([テクスチャAPI](../api/texture-api.md#モデル独自のテクスチャ-textureid-0))。

## 防具・コスメの区別

`flags.lifeform` は防具とコスメティックを含みます ([フラグ](../api/flags.md))。防具だけ、プレイヤー本体だけ、といった更細な区別をする入力は現行 API にはありません。座標 (`localPosition` — 防具はプレイヤーモデルの特定部位に配置されることが多い) や `overlayColour` の有無と組み合わせるのが実用的な近似です。

## Terrain と Model で同じ処理を共有する

フルブロックとブロックモデルで統一した見た目にしたい場合 (例: 色調を全体に統一):

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

共有関数のパターンはデフォルトパックテンプレート自身が推奨している書き方です ([シェーダーフック](../getting-started/hooks.md#フォールバックの規則))。

## 関連

- [モデルの描画とテクスチャ](../guides/models.md) — 基礎の解説
- [エンチャント効果](enchant-effects.md) — エンチャント入出力のレシピ
- [フラグ](../api/flags.md) — 14 フィールドの全容
- [入出力構造体](../api/structures.md) — `localPosition` / `enchantTier` 等
