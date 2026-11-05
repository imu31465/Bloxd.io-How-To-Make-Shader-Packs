# Ce qui change les valeurs visibles des packs

> API cible : 5 · Build cible : `bny9u` (2026-11-05, production) · État : Analyzed (analyse JavaScript du bundle de production)

Le même pack rend différemment selon **les réglages de monde et de joueur**. Vérifiez au moins ces 3 environnements avant de distribuer :

1. **Monde normal** (skybox par défaut, sans overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres et couleurs relevés

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (permutations hex) / `visionMinLightColour` (« couleur la plus sombre visible ». Implémenté comme un max par composante contre `uSkyLightColour` et `uAmbientLightColour` à la fois ; Night Vision l'utilise — les packs « grotte bien noire » n'iront pas aussi sombre que prévu, et la couleur de ciel elle-même est relevée) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `(1.0 - l.fogAlpha)` suit les réglages de brouillard / distance de chunks du joueur. S'y ajoutent comme facteurs de variation des réglages de monde : `cameraTint` (teinte RGBA sur tout l'écran) et `proximityFadeDistance` / `proximityFadeMinOpacity` (fondu de proximité caméra pour les entités) — `cameraTint` en particulier est une passe finale composée **par-dessus** la sortie du pack. Beaucoup d'entre eux peuvent aussi être fixés via l'API script (`serverOption`) et mis à jour pendant que le jeu tourne.
