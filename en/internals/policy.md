# Per-game shader-pack policy

> Target API: 5 · Target build: `ab90qa` (2026-11-03, production) · Status: Analyzed (production-bundle JavaScript analysis)
This page pins down what `allow / strict` means at the title level. Only titles whose game definition explicitly carries `shaderPackPolicy: "allow"` run in full mode (vertex hooks, `discard`, terrain `alpha`); titles with no setting (or any non-allow value) are strict — `BLOXD_STRICT` is defined and guarded code is disabled automatically. The pack side cannot choose this, so knowing which titles run what is a prerequisite for distribution.

- Reference build: `szby6g.main.94a7596c.js` (production deploy as of 2026-10-17). Statically enumerating all 111 game definitions gives **26 allow entries (12 titles) / 85 strict entries**. The same 12 allow literals across the same 12 titles were re-confirmed unchanged on the v3 production bundle (`3ymzdd`, 2026-10-20) and again on the v4 bundle (`cnty9`, 2026-10-27) — the list below carries over verbatim to v3 and v4.
- Above `shaderPackPolicy` there is a delivery-channel gate (roughly `canUseShaderPacks`): through external portals (e.g. Coolmath Games builds) the shader pack system itself can be disabled before `shaderPackPolicy` is ever consulted. The allow/strict analysis below is based on the bloxd.io main web build.
- allow is declared in 12 places: 8 direct literals in game definitions and 4 base variables (`tb` / `kz` / `cb` / `Fb`); variants inherit it via spread (`{...tb,...}`). There are currently no per-variant overrides (no parent-allow / child-strict pattern either).

The 12 allow titles (26 entries in total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entries)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 single titles**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

The most misleading strict-side cases:

- **Superflat Creative (classic_creativeFlat) is strict.** The name contains "Creative", but within the classic family only regular Creative (`classic_creative`) is allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. are all strict
- **Custom Games (customGames) is strict.** Vertex-hook effects do not fire in user-created custom games. Test Gym is the safe choice for verification work
- Major PvP / server titles such as bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) are all strict

Note that in strict titles the pack itself is still loaded and compiled, and fragment-side recipes such as surface / light run as usual. What is constrained: the vertex hooks (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, and terrain `alpha` (liquids always have it).

This list reflects the static analysis of the build above; engine updates can change the allow/strict split. Re-check when a new version ships.
