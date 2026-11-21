# 予約識別子の内部

> 対象API: 5 · 種別: 技術資料

`bloxdSp*` 名前空間 — 生成器が注入でき、ゆえにパックが再宣言できないシンボル群 — の実測です。パック作者向けの要約は [制限と予約名](../api/restrictions.md) を参照。
## 88シンボルの一覧

v4 の 27 から v5 発売時の 46 を経て `bbb6l5` で **88** へ (+42、廃止 0。歴史上の唯一の廃止は `bloxdSpLitColour` — 公開 `bloxdLitColour()` への昇格):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`

## 新名前 ↔ \`bbb6l5\` のシャドウシステム

新規 42 シンボルはすべて、\`bloxdShadow()\` / \`bloxdAirShadow()\` を支えるエンジンの太陽・月シャドウ実装に由来します:

- \`bloxdSpSunShadow\` / \`bloxdSpShadowVolume\` / \`bloxdSpShadowVolumeSampler\` / \`bloxdSpShadowVoxels\` — 太陽シャドウボリューム (プレイヤー周辺にエンジンが埋める 3D テクスチャ) とそのサンプラー
- \`bloxdSpShadowMarch\` / \`bloxdSpMarch\` / \`bloxdSpOrigin\` / \`bloxdSpRayFresh\` / \`bloxdSpExitBox\` — シャドウレイを解決するレイマーチ (64 ステップ、stale-box 新鮮度テスト)
- \`bloxdSpShadowMask\` / \`bloxdSpShadowPixel\` / \`bloxdSpMaskBit\` / \`bloxdSpMaskEdge\` — マスクテクスチャ経路 (マスクエッジ対応サンプリング)
- \`bloxdSpEntityLight\` / \`bloxdSpShadowEntities\` / \`bloxdSpShadowEntityGrids\` / \`bloxdSpEntityRow\` / \`bloxdSpCasterBlocks\` — エンティティ影のキャスト (プレイヤー・モブ・アイテム)
- \`bloxdSpShadowPosition\` / \`bloxdSpShadowNormal\` / \`bloxdSpShadowEmissive\` / \`bloxdSpShadowFirstPerson\` / \`bloxdSpShadowLight\` / \`bloxdSpShadowDz\` / \`bloxdSpShadowZ\` / \`bloxdSpShadowSpecial\` — フラグメントごとのシャドウ文脈 (emissive と一人称の除外)
- \`bloxdSpVolumeAt\` / \`bloxdSpVolumeOpenLit\` / \`bloxdSpVolumeTexel\` / \`bloxdSpVolumeOut\` / \`bloxdSpVolumeWork\` — ボリューム参照 (\`bloxdAirShadow\` のブロック専用・ブロック丸め経路)
- \`bloxdSpLit\` / \`bloxdSpFacing\` / \`bloxdSpFacingDot\` / \`bloxdSpT\` / \`bloxdSpCrossed\` / \`bloxdSpNormalCode\` / \`bloxdSpCellFull\` / \`bloxdSpWindowHas\` / \`bloxdSpWindowSlot\` / \`bloxdSpOwnTexture\` / \`bloxdSpPlaneTolerance\` — シャドウ・サンプリングコード生成の補助ローカル

## 新しい名前と v5 の機能の対応

- `bloxdSpFlags` — フラグ構造体 (`BloxdFlags`) の配送経路
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — 新入力 (エンチャント・モデルローカル座標)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — セル・サンプリングのテクスチャパック経路
- `bloxdSpQuarterTurns` — 回転連鎖 ([テクスチャサンプリング](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — 拡張フックの生成ローカル

## パックレベルの予約則

生成器が注入し得る名前空間より広い一般則がパックに適用されます: **`/^bloxd/i` に一致するすべて (大小文字無視)**。定義できるのは9つのフック関数 `bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>` のみです ([検証エラー](../troubleshooting/validation.md))。

`bloxdTextureId` で始まる識別子はテクスチャ名定数として解決を試みられ、専用のエラーファミリーを持ちます ([テクスチャの問題](../troubleshooting/textures.md))。

## 関連

- [制限と予約名](../api/restrictions.md) — 利用者向けの要約
- [テクスチャサンプリングの内部](texture-sampling.md) — これらのシンボルが使われる生成コード
- [バージョン履歴: v5](../history/v5.md) — v4 の 27 シンボルとの差分
