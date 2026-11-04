# パックに見える値を変えるもの

> 対象API: 5 · 対象ビルド: `xkg8x` (2026-11-04, 本番) · 検証状況: Analyzed (本番バンドルの JavaScript 解析)
同じパックでも**ワールドとプレイヤー設定によって**見え方が変わります。配布前に少なくとも次の 3 つの環境で確認してください:

1. **通常ワールド** (デフォルトスカイボックス、オーバーライドなし) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`、既定色
2. **space スカイボックスのワールド** — bloxdSunDirection() = 0。`sunPresent` 分岐の見た目
3. **`visionMinLightColour` / `skyLightColourOverride` を設定したカスタムワールド** — 暗部と色が持ち上がる

主な変動源: `lightingOverride` (照明の強制) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 差し替え) / `visionMinLightColour` (「視認可能な最暗色」。実装は `uSkyLightColour` と `uAmbientLightColour` の両方に対する成分ごとの max であり、Night Vision が使用します — 「真っ暗な洞窟」系のパックは意図したほど暗くならず、空の色自体も持ち上がります) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() の有無)。`uSkyLightColour` の既定値 = (1,1,1) 白、`uAmbientLightColour` の既定値 = (0.25,0.25,0.30)。`l.ambient` のシーン成分 = グラフィック設定「Ambient Lighting Intensity」(既定 0.5)。`(1.0 - l.fogAlpha)` はプレイヤーのフォグ/チャンク距離設定に追従します。さらに `cameraTint` (画面全体への RGBA ティント) と `proximityFadeDistance` / `proximityFadeMinOpacity` (エンティティのカメラ近接フェード) もワールド設定由来の変動要因です — 特に `cameraTint` はパック出力の**上に**重なる最終パスです。これらの多くはスクリプト API (`serverOption`) 経由でも設定でき、ゲーム実行中に更新されることもあります。
