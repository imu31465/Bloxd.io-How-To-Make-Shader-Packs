# パックに見える値を変えるもの

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

同一のパックでもワールドとプレイヤー設定により `l.*` の内容は変化する。配布前の環境マトリクス。


同一のパックでも、**ワールドとプレイヤー設定により `l.*` の内容が変化する**。配布前に、少なくとも以下の 3 つの環境で見た目を確認すること。

1. **通常ワールド** (default スカイボックス・オーバーライド無し) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`・既定色
2. **space 系スカイボックスのワールド** — bloxdSunDirection() = 0。`sunPresent` 分岐の見た目
3. **`visionMinLightColour`・`skyLightColourOverride` を設定したカスタムワールド** — 暗部と色が持ち上がるケース

主な変動源: `lightingOverride` (照明強制) / `skyLightColourOverride`・`ambientLightColourOverride` (hex 差し替え) / `visionMinLightColour` (視認最暗色。実装は `uSkyLightColour` と `uAmbientLightColour` 双方への成分毎 max であり、Night Vision が使用。「洞窟を真っ暗に」系は想定より暗くならず、空の色自体も底上げされる) / `heldLightColourOverride`・`Range`・`ConeAngle` / `fogChunkDistanceOverride`・`fogColourOverride`・`fogOnSkybox` / `skyBox` (bloxdSunDirection() の有無)。`uSkyLightColour` 既定 = (1,1,1) 白、`uAmbientLightColour` 既定 = (0.25,0.25,0.30)。`l.ambient` のシーン成分 = グラフィック設定「Ambient Lighting Intensity」(既定 0.5)。`(1.0 - l.fogAlpha)` はプレイヤーのフォグ/チャンク距離設定に追従。ほかに `cameraTint` (画面全体への RGBA ティント) と `proximityFadeDistance`・`proximityFadeMinOpacity` (エンティティのカメラ近接フェード) もワールド設定由来の変動要因で、特に `cameraTint` はパック出力の上に乗る最終処理である。これらの多くはスクリプト API (`serverOption`) 経由でも設定でき、ゲーム実行中にも更新され得る。

## 関連

- [実機テストのチェックリスト](../guides/testing.md)
- [エンジンデータ台帳](engine-data.md)
- [デバッグ手段](debugging.md)
