# ゲーム別の適用ポリシー

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

allow 12 タイトル / strict 85+ エントリの実測一覧。vertex フック系の効果が動くのは allow のみ。


[バリアントとガード](../getting-started/variants.md) の「allow / strict」がタイトル単位の設定であることがここで確定する。ゲーム定義側の `shaderPackPolicy` が明示的に `"allow"` のタイトルに限り full モード (vertex フック・`discard`・地形 `alpha`) で動作し、指定がない (または allow 以外の) タイトルは strict となる — `BLOXD_STRICT` が定義され、ガード内コードは自動的に無効化される。この判定はパック側からは選択できないため、どのタイトルで何が動作するかを把握しておくことが配布の前提となる。

- 根拠ビルド: `szby6g.main.94a7596c.js` (2026-10-17 時点の本番デプロイ) 以降、v5 ビルド `ab90qa` まで追跡。全 111 ゲーム定義を静的解析した結果、**allow 26 エントリ (12 タイトル) / strict 85 エントリ**。同じ 12 の allow リテラルが同じ 12 タイトルで v3 (`3ymzdd`、2026-10-20)・v4 (`cnty9`、2026-10-27)・v5 (`ab90qa`、2026-11-03) の各バンドルでも不変であることを再確認した — 以下のリストはそのまま v3・v4・v5 にも引き継がれる。
- `shaderPackPolicy` より上位の判定として配信チャネル側のゲート (`canUseShaderPacks` 相当) もあり、外部ポータル経由の配信 (Coolmath Games 版など) では `shaderPackPolicy` の判定に至る前段でシェーダーパック機構自体が無効化され得る。以下の allow / strict の判別は bloxd.io 本家 Web 版での解析に基づく。
- allow は基底定義の直書き 8 箇所と基底変数 (`tb` / `kz` / `cb` / `Fb`) の 4 箇所の計 12 箇所で宣言され、バリエーションはスプレッド継承 (`{...tb,...}`) で受け継ぐ。バリエーション単位での個別上書き (親が allow・子が strict の逆パターン) は現状存在しない。

allow の 12 タイトル (計 26 エントリ):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (計 11 エントリ)
- **Doodle Cube** — 本体 + Solos / Duos (計 3)
- **Rocket Obby** — 本体 + Sheep / January (計 3)
- **単独タイトル (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 側で特に誤解しやすい点は以下の通りである。

- **Superflat Creative (classic_creativeFlat) は strict**。「Creative」を名に含むが、classic 家族で allow なのは通常の Creative (`classic_creative`) のみ。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等も全件 strict
- **Custom Games (customGames) は strict**。自作カスタムゲームでは vertex フック系の効果は発動しない。作業用の検証は Test Gym で行うのが確実
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系の主要 PvP・サーバー系タイトルはすべて strict

なお strict タイトルでもパックの読み込みとコンパイル自体は行われ、surface / light 等のフラグメント側レシピは通常通り動作する。制約を受けるのは vertex フック (`bloxdTerrainVertex` / `bloxdLiquidVertex` / `bloxdModelVertex`) と `discard`、および地形の `alpha` (液体は常に存在) である。

この一覧は上記ビルド時点の静的解析結果であり、エンジンの更新により allow/strict の配分は変更され得る。新版が公開された際は再確認されたい。

[← 前の部](../guides/)・[マニュアルに戻る](../)・[次の部 →](../history/v2.md)
