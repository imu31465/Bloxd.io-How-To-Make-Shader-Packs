# Politique de shader pack par jeu

> API cible : 5 · Build cible : `v98qt8` (2026-11-08, production et preprod) · État : Analyzed (analyse JavaScript du bundle de production)
Cette page fixe ce que `allow / strict` signifie au niveau du titre. Seuls les titres dont la définition de jeu porte explicitement `shaderPackPolicy: "allow"` fonctionnent en mode complet (hooks de vertex, `discard`, `alpha` de terrain) ; les titres sans réglage (ou avec une valeur autre qu'allow) sont stricts — `BLOXD_STRICT` est défini et le code entouré de gardes est désactivé automatiquement. Le côté pack ne peut pas choisir cela : savoir quels titres exécutent quoi est un prérequis pour la distribution.

- Build de référence : `szby6g.main.94a7596c.js` (déploiement en production au 2026-10-17). L'énumération statique des 111 définitions de jeu donne **26 entrées allow (12 titres) / 85 entrées strictes**. Les mêmes 12 littéraux allow sur les mêmes 12 titres ont été reconfirmés inchangés sur le bundle de production v3 (`3ymzdd`, 2026-10-20) puis de nouveau sur le bundle v4 (`cnty9`, 2026-10-27) — la liste ci-dessous se transpose telle quelle en v3 et v4. Et sur les builds v5, à nouveau inchangé : reconfirmé sur `ab90qa` (2026-11-03) et `xkg8x` (2026-11-04, 12 littéraux allow recomptés). Sur `bny9u` (2026-11-05), l'énumération complète a été relancée : le nombre de définitions de jeu est passé de 111 à **115** et le côté allow de 26 à **28 entrées** — toujours les mêmes 12 titres, rejoints par deux nouvelles variantes de Test Gym (Imported Mobs, Interest). La liste ci-dessous s'applique telle quelle aussi à v5. Sur `v98qt8` (2026-11-08), l'énumération a été relancée (module jeux 513 du bundle principal, évalué dans un harnais) : **116 définitions / 28 entrées allow (12 titres) / 88 strict** — le côté allow est inchangé, une définition strict de plus.
- Au-dessus de `shaderPackPolicy` existe un verrou de canal de distribution (en gros `canUseShaderPacks`) : via des portails externes (p. ex. les builds Coolmath Games), le système de shader packs lui-même peut être désactivé avant même que `shaderPackPolicy` soit consulté. L'analyse allow/strict ci-dessous repose sur le build web principal de bloxd.io.
- allow est déclaré en 12 endroits : 8 littéraux directs dans les définitions de jeu et 4 variables de base (`tb` / `kz` / `cb` / `Fb`) ; les variantes l'héritent par spread (`{...tb,...}`). Il n'existe actuellement aucune surcharge par variante (pas non plus de motif parent-allow / enfant-strict).

Les 12 titres allow (26 entrées au total) :

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (13 entrées)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 titres isolés** : Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Les cas les plus trompeurs côté strict :

- **Superflat Creative (classic_creativeFlat) est strict.** Le nom contient « Creative », mais dans la famille classic seul le Creative habituel (`classic_creative`) est allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. sont tous stricts
- **Custom Games (customGames) est strict.** Les effets de hooks de vertex ne se déclenchent pas dans les jeux personnalisés créés par les utilisateurs. Test Gym est le choix sûr pour le travail de vérification
- Les grands titres PvP / serveur comme bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sont tous stricts

Notez qu'en titres stricts le pack reste chargé et compilé, et que les recettes côté fragment comme surface / light fonctionnent comme d'habitude. Ce qui est contraint : les hooks de vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, et l'`alpha` de terrain (les liquides l'ont toujours).

Cette liste reflète l'analyse statique du build ci-dessus ; des mises à jour du moteur peuvent modifier la répartition allow/strict. À revérifier à chaque nouvelle version.
