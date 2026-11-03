# テクスチャの問題

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Verified (メッセージはライブバリデータから逐語採録)

`bloxdTextureId*` / `bloxdTexel` まわりの問題です。906 件超のテクスチャ名は [テクスチャカタログ](../api/texture-catalog.md) で検索できます。

## 「There's no texture called X. Did you mean bloxdTextureIdY?」

- **症状**: 未定義のテクスチャ名を書いた
- **原因**: 綴りミス。v5 のバリデータは**レーベンシュタイン距離によるスペル補正提案**を持つ (閾値 `max(2, floor(len/4)) + 1`)
- **確認方法**: 提案された `bloxdTextureIdY` と [カタログ](../api/texture-catalog.md) を照合
- **解決方法**: 提案の綴りに直す
- **再発防止**: 名前は [カタログ](../api/texture-catalog.md) からコピペする

## 「...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.」

- **原因**: アニメーションテクスチャに**フレーム番号を付けた** (`lava0` 等)
- **解決方法**: 基底名 `bloxdTextureIdLava` を使う — サンプリングすると現在のフレームが自動で返る
- **再発防止**: アニメ族 (42族) のフレーム接尾辞は書かない ([命名規則](../api/texture-api.md#bloxdtextureid-テクスチャ名定数))

## 「...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.」

- **原因**: 回転族 (57族) の回転コピー綴り (`[rot[N`) を書いた
- **解決方法**: root 名を使う — `bloxdTexel` がサンプル時に回転を再適用する

## 「...could name X and Y, which differ only by case or underscores, so it can't be used.」

- **原因**: 大文字小文字・アンダースコアを無視する照合の後で**曖昧**になった
- **解決方法**: 綴りをどちらか一意に特定する (正確な CamelCase 綴りで書く)

## 「bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?」

- **原因**: 接頭辞の綴り間違い / 大小文字違い (例: `bloxdTextureID` や `bloxdtextureid`)
- **解決方法**: 接頭辞は正確に `bloxdTextureId` で始める (接頭辞自体は大小文字を区別しない照合になるため、このメッセージは主に `ID`/`Id` の打ち間違いや断片綴りで出る)

## 綴りなのに「大小文字とアンダースコアは区別されない」？

両立しています: **名前解決の折り畳み**は大小文字・`_` を区別しないため、`bloxdTextureId_grass_top` と `bloxdTextureIdGrassTop` は同一の定数に解決されます。ただし折り畳み後に複数候補が残る (曖昧な) 場合は専用エラーになります ([命名規則](../api/texture-api.md#綴り規則と命名の自由度))。

## モデル面で `bloxdTexel` の結果が常に白い

- **原因**: **仕様** — モデルの多くは `textureId: 0` (テクスチャなし、プレイヤースキン等)。`bloxdTexel(0, ...)` は `vec4f(1.0)` (白) を返す
- **解決方法**: `surface.textureId != 0u` で選別する ([モデル独自のテクスチャ](../api/texture-api.md#モデル独自のテクスチャ-textureid-0))

## テクスチャの追加がしたい

- **限界**: シェーダーパックAPIはアトラスを**読むだけ**。テクスチャの追加はテクスチャパック機構の仕事 ([限界がある場合の組み合わせ](../guides/combinations.md))

## 「Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.」

- **原因**: `texture_*` / `sampler` 型を直接宣言した
- **解決方法**: `bloxdTexel()` 経由に書き換える ([制限](../api/restrictions.md))

## id を直書きしたらゲーム更新で壊れた

- **原因**: **id はスナップショット**。2ビルド間で 905 生存名のうち 334 名が id を変えた実測がある
- **解決方法**: `bloxdTextureIdLava` と書け、`19` と書くな ([名前こそ API](../api/texture-catalog.md#ドリフト実測-cnty9-ab90qa))

## 関連

- [テクスチャAPI](../api/texture-api.md) — 仕様の全体
- [テクスチャカタログ](../api/texture-catalog.md) — 896名の検索可能な一覧
- [Engine Internals: Texture Registry](../internals/texture-registry.md) — レジストリとドリフトの内部
