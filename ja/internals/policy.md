# ゲーム別の適用ポリシー

> 対象API: 5 · 種別: 技術資料

allow / strict の違いと、vertex フックが使用できるタイトルをまとめています。

[バリアントとガード](../getting-started/variants.md) の「allow / strict」がタイトル単位の設定であることがここで確定する。ゲーム定義側の `shaderPackPolicy` が明示的に `"allow"` のタイトルに限り full モード (vertex フック・`discard`・地形 `alpha`) で動作し、指定がない (または allow 以外の) タイトルは strict となる — `BLOXD_STRICT` が定義され、ガード内コードは自動的に無効化される。この判定はパック側からは選択できないため、どのタイトルで何が動作するかを把握しておくことが配布の前提となる。

- `shaderPackPolicy` より上位の判定として配信チャネル側のゲート (`canUseShaderPacks` 相当) もあり、外部ポータル経由の配信 (Coolmath Games 版など) では `shaderPackPolicy` の判定に至る前段でシェーダーパック機構自体が無効化され得る。以下の allow / strict の判別は bloxd.io 本家 Web 版での解析に基づく。


- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (計 13 エントリ)
- **Doodle Cube** — 本体 + Solos / Duos (計 3)
- **Rocket Obby** — 本体 + Sheep / January (計 3)
- **単独タイトル (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 側で特に誤解しやすい点は以下の通りである。

- **Superflat Creative (classic_creativeFlat) は strict**。「Creative」を名に含むが、classic 家族で allow なのは通常の Creative (`classic_creative`) のみ。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等も全件 strict
- **Custom Games (customGames) は strict**。自作カスタムゲームでは vertex フック系の効果は発動しない。作業用の検証は Test Gym で行うのが確実
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系の主要 PvP・サーバー系タイトルはすべて strict

なお strict タイトルでもパックの読み込みとコンパイル自体は行われ、surface / light 等のフラグメント側レシピは通常通り動作する。制約を受けるのは vertex フック (`bloxdTerrainVertex` / `bloxdLiquidVertex` / `bloxdModelVertex`) と `discard`、および地形の `alpha` (液体は常に存在) である。


[← 前の部](../guides/)・[マニュアルに戻る](../)・[次の部 →](../history/v2.md)

配布前には、対象ゲームでパックを実際に読み込み、必要なフックが動作することを確認してください。
