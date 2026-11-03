# Ce qui change les valeurs visibles du pack — liste de tests



Le même pack rend différemment selon **monde et réglages joueur**. Revoyez au moins ces 3 environnements avant de distribuer :

1. **Monde normal** (skybox default, sans overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (« couleur la plus sombre visible ». Implémenté comme un max par composante contre `uSkyLightColour` et `uAmbientLightColour` à la fois ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu, et la couleur de ciel elle-même est relevée) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `(1.0 - l.fogAlpha)` suit les réglages de brouillard/distance de chunks du joueur. Autres facteurs de variation par monde : `cameraTint` (teinte RGBA sur tout l'écran) et `proximityFadeDistance` / `proximityFadeMinOpacity` (fondu de proximité caméra pour les entités) — `cameraTint` en particulier est une passe finale composée **par-dessus** la sortie du pack. Beaucoup de ces réglages passent aussi par l'API script (`serverOption`) et se mettent à jour en cours de partie.
