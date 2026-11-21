# Politique de shader pack par jeu

> API cible : 5 · Type : référence technique
Cette page fixe ce que `allow / strict` signifie au niveau du titre. Seuls les titres dont la définition de jeu porte explicitement `shaderPackPolicy: "allow"` fonctionnent en mode complet (hooks de vertex, `discard`, `alpha` de terrain) ; les titres sans réglage (ou avec une valeur autre qu'allow) sont stricts — `BLOXD_STRICT` est défini et le code entouré de gardes est désactivé automatiquement. Le côté pack ne peut pas choisir cela : savoir quels titres exécutent quoi est un prérequis pour la distribution.

- Au-dessus de `shaderPackPolicy` existe un verrou de canal de distribution (en gros `canUseShaderPacks`) : via des portails externes (p. ex. les builds Coolmath Games), le système de shader packs lui-même peut être désactivé avant même que `shaderPackPolicy` soit consulté. L'analyse allow/strict ci-dessous repose sur le build web principal de bloxd.io.


## Titres allow

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (13 entrées)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 titres isolés** : Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Les cas les plus trompeurs côté strict :

- **Superflat Creative (classic_creativeFlat) est strict.** Le nom contient « Creative », mais dans la famille classic seul le Creative habituel (`classic_creative`) est allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. sont tous stricts
- **Custom Games (customGames) est strict.** Les effets de hooks de vertex ne se déclenchent pas dans les jeux personnalisés créés par les utilisateurs. Test Gym est le choix sûr pour le travail de vérification
- Les grands titres PvP / serveur comme bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sont tous stricts

Notez qu'en titres stricts le pack reste chargé et compilé, et que les recettes côté fragment comme surface / light fonctionnent comme d'habitude. Ce qui est contraint : les hooks de vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, et l'`alpha` de terrain (les liquides l'ont toujours).


Avant de distribuer un pack, testez-le dans le jeu cible et vérifiez que les hooks dont vous avez besoin y fonctionnent.
