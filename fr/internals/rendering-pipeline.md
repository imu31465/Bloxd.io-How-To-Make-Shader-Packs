# Détails de pipeline



- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente le test d'écart directement. Les matériaux cutout (herbe, feuilles) permettent des effets de dissolution type dither (recette R-C). En liquides (mélange) `out.alpha` est la transparence réelle (recette R-D). Sans effet en terrain opaque normal — ne pas confondre
- **Contenu de `l.ambient`** : `material.ambient × sceneAmbient`, distinct par matériau. Le côté scène attache au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne programmez jamais de défauts fixes
- **Les lumières directionnelles de la scène forment un rig à 2 lumières** : la somme Lambert de la lumière principale (direction issue de la position du soleil réglée dans la skybox, intensité 1.0) et de la lumière de remplissage (direction `[-0.5, -1, -1]`, intensité 0.35) arrive dans `l.directional`. La lumière de remplissage pointe vers le bas : elle n'ajoute rien aux faces vers le haut et rattrape les surfaces tournées vers le bas (plafonds de grottes etc.). Le terrain ne considère que les lumières ajoutées dans `_initScene` ; celles ajoutées après le démarrage sont ignorées du terrain et des modèles de blocs (un message d'avertissement officiel le dit)
- **`bloxdSeconds()` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `bloxdSunDirection()` en mondes à cycle jour/nuit
- **Les fonctions d'en-tête lisent un seul uniform** : le moteur place un uniform de 64 octets à `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), et `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondent à la lecture de ces slots. `originOffset` vaut toujours `[0, 0, 0]` dans le build actuel (slot réservé pour les coordonnées monde en virgule flottante). Un pack ne peut pas écrire cet uniform, et comme le WGSL du pack et celui du moteur fusionnent en un seul module, déclarer soi-même le même group/binding est également impossible. (La v3 renomme les deux slots — `seconds` / `renderOffset`, exposés sous les noms `bloxdSeconds()` / `bloxdRenderOffset()` — et ajoute la texture de profondeur de scène à `@group(3) @binding(1)` ; voir [Partie IX](../history/v3.md) §41 et §51.)
- **Les données vertex sont construites par le mesher (Web Worker)** : le terrain de blocs est entrelacé à 28 octets par vertex (32 octets quand l'atlas est actif) — position = float32×3 / normale = entier signé 8 bits×4 / couleur = entier normalisé 8 bits×4 (la substance de `s.colour` — teinte × AO est cuite en 8 bits à l'étape mesher, la séparer ou la restaurer côté pack est donc impossible par principe) / UV = float32×2 / atlasIndex = float32. Seuls les niveaux de lumière voyagent dans un buffer vertex séparé de 4 octets ([Partie VII](../internals/) §26, [Partie II](../api/) §11). Les vertices sont dessinés en instanciation par chunk
- Les fins damiers aux bords de chunk au chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack (désactivable via le réglage graphique `chunkFadeIn`)
- **`mod` est un mot réservé** : rejeté avec `pack.wgsl:3 'mod' is a reserved word in WGSL.` Écrivez les restes avec l'opérateur `%`

## R-C. Dissolution par dither Bayer — out.alpha contrôle discard

Reproduit la **même table Bayer 4×4** que le moteur utilise en fondus de chunk, dissolvant les cutouts depuis les blocs bas. discard se déclenche en matériaux alphaTest (herbe, feuilles) ; en liquides c'est de la transparence de mélange.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod est réservé : utilisez l'opérateur %
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
    // se dissout depuis les blocs bas ; plus dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fondu d'eau proche caméra — l'alpha liquide dégage la vue

L'`out.alpha` du hook liquide alimente le mélange directement. Dégage juste la surface sous la caméra pour assurer la vue en plongée ou caméra sur l'eau.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 blocs de transparent total à normal
    #endif
    return out;
}
```
