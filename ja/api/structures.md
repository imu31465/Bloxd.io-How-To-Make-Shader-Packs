# 入出力構造体

> 対象API: 5 · 対象ビルド: `v98qt8` · 検証状況: Analyzed (ライブヘッダーから逐語復元)

パックから読み書きできる構造体は7つです。すべてのフィールドを以下に掲載します (`#ifdef` で囲まれたフィールドはバリアントにより存在が変わる条件付きフィールド)。ヘッダー全文は [エンジン内部: Engine Header](../internals/engine-header.md) を参照。

## BloxdVertexIn (頂点フックの入力)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `position` | `vec3f` | レンダー座標 (カメラ近傍に原点を持つ座標系。ワールド座標は `bloxdWorldPosition()` で復元) |
| `normal` | `vec3f` | 面から外向きの単位ベクトル |
| `localPosition` | `vec3f` | モデルインスタンスのローカル座標。**地形と液体では `vec3f(0.0)`**。プレイヤーの腕・保持した剣・風車の羽根などではモデルと一緒に回る座標 |
| `flags` | `BloxdFlags` | 面の種別 ([フラグ](flags.md)) |

## BloxdVertex (頂点フックの出力)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (surface フックの入力)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `colour` | `vec3f` | RGB = テクスチャ × 色被せ (tint) × 環境光遮蔽 (AO)。メッシャーが焼き込んだ値 |
| `alpha` | `f32` | 不透明度 |
| `enchantTier` | `u32` | エンチャント階梯 1〜5。エンチャントされたアイテム・防具以外では 0 |
| `enchantColour` | `vec4f` | エンチャントの RGB と**アニメーションする**アルファ (`.a`)。エンジンがきらめきの掃引をアニメーションするため、`.a` をフラグメント毎に読むだけで動くパターンになる。エンチャント面以外ではすべてゼロ |
| `enchantSpeed` | `f32` | エンチャントパターンの移動速度 («faster at higher tiers» — `enchantTier` と矛盾しない) |
| `overlayColour` | `vec4f` | エンティティのオーバーレイ (ダメージ赤フラッシュ等) RGB + アルファ。プレイヤー・モブ以外では 0。`bloxdLitColour` がライティング前に混合する |
| `position` / `normal` / `localPosition` / `flags` | — | `BloxdVertexIn` と同じ意味 (**vertex フック適用後**の値。vertex フックが頂点を動かせば追従する) |
| `textureId` | `u32` | この面のテクスチャ ID。`bloxdTextureId*` 定数と比較する。**テクスチャのない面では 0** — モデルの多くは textureId 0 (モデル独自テクスチャ・プレイヤースキン等) |
| `textureRotation` | `u32` | 時計回りの四半回転数 (0〜3)。`bloxdTexel` が適用する |
| `uv` | `vec2f` | テクスチャが 0〜1 に広がる。`fract(uv)` が描画される (uv の整数刻みがタイル繰り返し) |
| `mipLevel` | `f32` | テクスチャミップマップレベル。0 = フルサイズ、1 = 半分… |

## BloxdSurface (surface フックの出力)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| フィールド | 型 | 条件 | 説明 |
|---|---|---|---|
| `colour` | `vec3f` | 常に | RGB 出力 |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (全 liquid + 非 strict の terrain/model) | 不透明度出力 |
| `emission` | `vec3f` | 常に | 発光 RGB。**ライティング後に加算、フォグの前** |
| `enchantColour` | `vec4f` | 常に | エンチャント出力。`bloxdLitColour` が混合する |
| `overlayColour` | `vec4f` | 常に | オーバーレイ出力。`bloxdLitColour` が混合する |

`bloxdDefaultSurface` は `enchantColour` / `overlayColour` を無変更で通すため、デフォルトの見た目は v4 のエンジン内部挙動と同一です。カスタムライティングでエンチャントきらめきを消すなら `out.enchantColour = vec4f(0.0)`、被弾フラッシュを強調するなら `out.overlayColour.a` を増幅します。

## BloxdLightIn (light フックの入力)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

各フィールドの詳細な意味と照明計算での役割は [ライティング](lighting.md) を参照 (処理順序とともに解説)。

**旧バージョンとの対比**: `fogVisibility` (v2〜v4) は意味が反転した `fogAlpha` (0 = フォグなし) に、`engineColour` は `litColour` に、軽レベルの文言は «0 when !bloxdLit()» になりました。バージョンごとの全フィールド変更は[バージョン履歴](../history/)にあります。

## BloxdLight (light フックの出力)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (特殊関数の戻り値)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

`bloxdOpaqueBehind()` の戻り値。Liquid バリアントで `#ifdef BLOXD_SCENE_DEPTH` ガード付きで使用します (v2 では `found: bool` だったフィールドが `hit: bool` に改名)。

## 条件付きフィールドとマクロの関係

| フィールド | 存在条件 | 備考 |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | 全 liquid バリアント + 非 strict の terrain / model |
| `bloxdOpaqueBehind()` 呼び出し | `#ifdef BLOXD_SCENE_DEPTH` | 全 liquid バリアント |

`BLOXD_STRICT` は構造体の形ではなく**フックの存在** (vertex フック) を制御します。プリプロセッサの詳細は [プリプロセッサ](preprocessor.md) を参照。

## 書き方の作法 (再掲)

- 出力構造体は**直接構築しない** (`BloxdSurface(...)` は検証エラー)。`bloxdDefault*` から作る。light フックの第 1 引数は出力と同型なので `var out = s;` も可
- 未初期化の `var x: BloxdSurface;` も検証エラー
- フックの引数は読み取り専用。書き換えはコピーを作ってから

## 関連

- 全フィールドを使う照明計算 → [ライティング](lighting.md)
- `flags` の14フィールド → [フラグ](flags.md)
- `textureId` / `uv` / `mipLevel` の使い方 → [テクスチャAPI](texture-api.md)
