# Shader-Pack-Richtlinien je Spiel

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Analyzed (Analyse des Produktions-Bundles auf JavaScript-Ebene)

Diese Seite legt fest, was „allow / strict" auf Titelebene bedeutet. Nur Titel, deren Spieldefinition ausdrücklich `shaderPackPolicy: "allow"` enthält, laufen im vollen Modus (Vertex-Hooks, `discard`, Terrain-`alpha`); Titel ohne Angabe (oder mit einem anderen Wert) sind strict — `BLOXD_STRICT` wird definiert, umschlossener Code automatisch deaktiviert. Das Paket kann dies nicht selbst wählen; zu wissen, in welchen Titeln was läuft, ist Voraussetzung für das Verteilen.

- Referenz-Build: `szby6g.main.94a7596c.js` (Produktions-Deployment zum 2026-10-17). Statische Auswertung aller 111 Spieldefinitionen: **26 allow-Einträge (12 Titel) / 85 strict-Einträge**. Dieselben 12 allow-Literale in denselben 12 Titeln wurden im v3-Produktions-Bundle (`3ymzdd`, 2026-10-20) unverändert erneut bestätigt und nochmals im v4-Bundle (`cnty9`, 2026-10-27) — die folgende Liste gilt wortgleich auch für v3 und v4.
- Oberhalb von `shaderPackPolicy` gibt es ein Gate auf Auslieferungskanal-Ebene (grob `canUseShaderPacks`): Über externe Portale (z. B. Coolmath-Games-Builds) kann das Shader-Paket-System selbst deaktiviert sein, bevor `shaderPackPolicy` überhaupt konsultiert wird. Die Allow/Strict-Analyse unten basiert auf dem bloxd.io-Haupt-Web-Build.
- allow wird an 12 Stellen deklariert: 8 direkte Literale in den Spieldefinitionen und 4 Basisvariablen (`tb` / `kz` / `cb` / `Fb`); Varianten erben über Spread (`{...tb,...}`). Eine Übersteuerung pro Variante (Eltern-allow / Kind-strict) gibt es derzeit nicht.

Die 12 allow-Titel (insgesamt 26 Einträge):

- **Test Gym** — Basis + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (insgesamt 11 Einträge)
- **Doodle Cube** — Basis + Solos / Duos (3)
- **Rocket Obby** — Basis + Sheep / January (3)
- **9 Einzeltitel**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Die missverständlichsten Punkte auf der strict-Seite:

- **Superflat Creative (classic_creativeFlat) ist strict.** Der Name enthält „Creative", aber in der classic-Familie ist nur das normale Creative (`classic_creative`) allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns usw. sind komplett strict
- **Custom Games (customGames) ist strict.** Vertex-Hook-Effekte feuern nicht in selbst erstellten Custom Games. Zum Verifizieren ist Test Gym die sichere Wahl
- Große PvP-/Server-Titel wie bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sind allesamt strict

Auch in strict-Titeln wird das Paket geladen und kompiliert; Fragment-Rezepte wie surface / light funktionieren normal. Eingeschränkt sind die Vertex-Hooks (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` und Terrain-`alpha` (bei Flüssigkeiten stets vorhanden).

Diese Liste spiegelt die statische Analyse des genannten Builds wider; Engine-Updates können die allow/strict-Aufteilung ändern. Bei neuen Versionen nachkontrollieren.
