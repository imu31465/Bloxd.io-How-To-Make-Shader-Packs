# 予約識別子の内部

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブバンドルの生成器から復元)

`bloxdSp*` 名前空間 — 生成器が注入でき、ゆえにパックが再宣言できないシンボル群 — の実測です。パック作者向けの要約は [制限と予約名](../api/restrictions.md) を参照。

## 46シンボルの一覧

v4 の 27 から **46 シンボル**へ増えました (20 追加、1 引退 — `bloxdSpLitColour`、その役割は公開の `bloxdLitColour()` へ):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

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
- [Texture Sampling](texture-sampling.md) — これらのシンボルが使われる生成コード
- [Version History: v5](../history/v5.md) — v4 の 27 シンボルとの差分
