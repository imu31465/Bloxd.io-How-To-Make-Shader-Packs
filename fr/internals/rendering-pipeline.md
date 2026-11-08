# Pipeline de rendu

> API cible : 5 · Build cible : `v98qt8` (2026-11-08, production et preprod) · État : Analyzed (analyse JavaScript du bundle de production)
- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente directement le test discard. Les matériaux cutout (herbe, feuilles) permettent des effets de dither façon dissolution (recette R-C). Pour les liquides (rendus en blend) `out.alpha` est la vraie transparence (recette R-D). Aucun effet sur le terrain opaque normal — ne pas s'y méprendre
- **Le contenu de `l.ambient`** est `material.ambient × sceneAmbient`, distinct selon le matériau. Le côté scène est lié au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne codez jamais les valeurs par défaut en dur
- **Les lumières directionnelles de la scène forment un setup à 2 lumières** : la somme Lambert de la lumière principale (direction issue de la position du soleil du réglage de ciel, intensité 1.0) et de la lumière de remplissage (direction `[-0.5, -1, -1]`, intensité 0.35) parvient dans `l.directional`. La lumière de remplissage pointe vers le bas : elle n'apporte rien aux faces du haut et rattrape les surfaces tournées vers le bas (plafonds de grottes etc.). Le terrain ne considère que les lumières ajoutées dans `_initScene` ; les lumières ajoutées à la scène après le démarrage sont ignorées du terrain et des modèles de blocs (un message d'avertissement officiel le dit)
- **`bloxdSeconds()` est en réalité `performance.now()`** : l'uptime du navigateur, bouclé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer en synchronisation avec une horloge de jeu, estimez le temps depuis l'azimut de `bloxdSunDirection()` dans les mondes à cycle jour/nuit
- **Les fonctions d'en-tête lisent un seul uniform** : le moteur place l'uniform `bloxdPackInputs` de 64 octets à `@group(3) @binding(0)` (5 slots — seconds / lit / renderOffset / sunDirection / eyePosition, petit-boutiste), et `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondent à la lecture de ces slots ([Format du pack : uniform par frame](../api/pack-format.md#uniform-par-frame--bloxdpackinputs)). Les packs ne peuvent pas écrire cet uniform, et comme le WGSL du pack et celui du moteur fusionnent en un seul module, déclarer soi-même le même group/binding est tout aussi impossible. `@group(3) @binding(1)` porte la texture de profondeur de scène des liquides, et `@binding(2)` le buffer de stockage `bloxdSpTextureLayers`
- **Les données vertex sont construites par le mesher (Web Worker)** : le terrain de blocs est entrelacé à 28 octets par vertex (32 octets quand l'atlas est actif) — position = float32×3 / normale = entier signé 8 bits×4 / couleur = entier normalisé 8 bits×4 (la substance de `s.colour` — la teinte × AO y est cuite en 8 bits à l'étape du mesher, la séparer ou la restaurer côté pack est donc impossible par principe) / UV = float32×2 / atlasIndex = float32. Seuls les niveaux de lumière voyagent dans un buffer vertex séparé de 4 octets (valeurs mesurées : [Relevé de données du moteur](engine-data.md)). Les vertices sont dessinés avec instanciation par chunk
- Les fins damiers aux bords de chunk pendant le chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack (désactivable via le réglage graphique `chunkFadeIn`)
- **`mod` est un mot réservé** : rejeté avec `pack.wgsl:3 'mod' is a reserved word in WGSL.` Écrivez les restes avec l'opérateur `%`

## R-C. Dissolution par dither Bayer — out.alpha pilote discard

Reproduit la **même table Bayer 4×4** que le moteur utilise pour les fondus de chunk, en dissolvant les cutouts depuis les blocs bas vers le haut. discard se déclenche sur les matériaux alphaTest (herbe, feuilles) ; en liquides il devient de la transparence de blend.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod est réservé : utilisez donc l'opérateur %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // dissolution depuis les blocs bas vers le haut ; en hauteur, la dissolution persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fondu d'eau proche caméra — l'alpha liquide préserve la vue

L'`out.alpha` du hook liquide alimente le blend directement. Estompe juste la surface d'eau sous la caméra pour préserver la vue en plongée et caméra hors de l'eau.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // totalement transparent → normal sur 0–3 blocs
    #endif
    return out;
}
```
