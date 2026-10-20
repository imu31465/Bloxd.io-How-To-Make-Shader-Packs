[← Partie précédente](06-implementation.md)·[Retour au manuel](README.md)·[Partie suivante →](08-apiv2.md)

# Partie VII : Supplément d'intérieurs

Spécifications extra trouvées par analyse d'implémentation du moteur. Tout restauré directement du JavaScript du build de production actuel.

## 24. Identité du soleil et de la lune

La source de `bloxdSunDirection()` est un tampon de direction solaire réécrit seulement quand change le type de skybox — le critère n'est pas « si le ciel a un soleil » mais **« si le skybox est de type terre »**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (ciel procédural) | Non zéro (défauts ci-dessous) |
| `gloomy` / `interstellar` / `space_*` (textures cubiques) | **Toujours (0,0,0)** |

**La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). La nuit se juge par hauteur solaire — il y a lune en haut quand `bloxdSunDirection().y < 0` (soleil sous l'horizon). Mais dans les mondes par défaut le soleil est statique, la lune aussi — seuls les mondes à cycle jour/nuit la voient bouger.

La direction solaire par défaut tourne autour de `(-0.56, 0.81, -0.18)` (vecteur unitaire d'inclination = −0.2 / azimuth = 0.55, statique). Référence pratique pour prédire les directions de reflet en testant des packs de distribution.

Les cycles jour/nuit ne sont pas intégrés au moteur — inclination est un nombre statique que les mondes à jour mobile actualisent côté jeu. `bloxdSunDirection()` suit chaque mise à jour.

Les lumières directionnelles du terrain ne sont que 2 lampes créées au démarrage de scène, de **direction et intensité fixes, sans changement jour/nuit**. En bref : **aucun facteur de brillance du terrain ne dépend du temps. Les « looks » jour/nuit viennent seulement de la skybox et de bloxdSunDirection()** : les packs assombrissant de nuit doivent donc estimer la tranche horaire depuis bloxdSunDirection() (la technique `sunPresent` de §19).

### R-A. Clair de lune directionnel — moonDir = −bloxdSunDirection()

Ajoute du Lambert blanc-bleuté et un faible specular tant que la lune est en haut. `moonUp` vaut 0 dans les mondes à soleil statique par défaut : rien ne s'y passe — **clair de lune qui ne se déclenche qu'en mondes à cycle jour/nuit, donc sûr**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // la lune est toujours exactement opposée au soleil ; auto-off diurne via moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Intérieurs du brouillard

Le calcul du brouillard est toujours en mode LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `l.fogVisibility` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (recette R-B). (Note v3 : la fonction de brouillard du moteur implémente en réalité **quatre** modes — désactivé / exponentiel / exponentiel au carré / linéaire — et les titres livrés avec le jeu pilotent le mode linéaire ; le code restauré et l'argument de robustesse se trouvent dans la [Partie IX](09-apiv3.md) §50.)

Couleur de brouillard par défaut `rgb(181, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, l.fogVisibility)` est sûre car la couleur de brouillard ne sert pas à fogVisibility 1. L'API script propose deux options de plus, `fogChunkDistanceOverride` et `fogOnSkybox` : les Custom Games peuvent régler indépendamment la distance de brouillard (la valeur D) et l'application du brouillard à la skybox. Par défaut la skybox n'est pas affectée par le brouillard (seuls les jeux activant `fogOnSkybox` teintent aussi la skybox avec la couleur de brouillard).

Régler `showFog` à false pousse le brouillard à 3200–3232 blocs, le désactivant de fait (`fogVisibility ≈ 1` continue à venir).

### R-B. Bande de bord de chargement — fogVisibility en « bord du monde »

Refroidit en silence juste la bande de 32 blocs du bord de chargement pour estomper la fin du monde (ou l'accentuer en effet). Sans distance autocalculée : suit auto les réglages de distance de chargement du joueur.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility : 1 = dedans (marge au bord), 0 = sur le point de sortir du bord
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Intérieurs de blockLight / heldLight

`blockLight` est une **lumière colorée** à trois canaux RVB. Chaque bloc émetteur définit une couleur d'émission `[R, G, B]` (0–15 chacun) reprise telle quelle comme couleur de lumière (torche normale = blanc chaud (14,14,12) / lave = orange (14,8,2) / beacon = cyan (5,14,14) / torche blanche = (15,15,15), etc.). En étage vertex elle arrive empaquetée en 4 nibbles — r / g / b / sky — dans un attribut flottant. Traiter les trois canaux séparément dans le hook light ouvre l'éclairage local coloré — la recette de torche chaude (R9.1) est calibrée sur ce comportement.

En décodant `aPackedLightLevels`, le moteur met à chaque canal un **plancher de 35 % du canal RVB le plus brillant**. P. ex. une « lumière rouge pure » monte à (1,00, 0,35, 0) en sommets avant interpolation et lift. L'orange de torche paraissant « rose blanchâtre plutôt que rouge » vient d'ici — réglez la saturation des recettes de torche chaude (R9.1) contre ce défaut.

La composition de lumière n'est pas additive. En interne le moteur prend le **max** entre la lumière de bloc (après le plancher de 35 %) et la lumière de ciel construite en `mix(couleur ambiante, couleur de ciel, skyLight)`, puis prend encore le max avec la lumière de main (après boost d'ambiant). Les valeurs de canal dans cette composition sont des valeurs brutes (pré-lift), distinctes des valeurs post-lift qui arrivent aux entrées des hooks. Donc `blockLight` et `skyLight` ne s'annulent jamais l'un l'autre — la contribution du côté le plus sombre est simplement jetée — affaiblir la lumière de ciel n'assombrit donc guère les zones dominées par blockLight. Concevez les recettes d'exposition / d'atténuation autour de cette structure (la protection de lumière locale en [Partie VI](06-implementation.md) §19 existe pour compenser cela).

La lumière de main (`heldLight`) a une portée selon le canal le plus brillant (max 15 blocs) avec prétraitement `dist^0.75`, le même plancher 35 %, et `l.heldLight` est la valeur **pré**-boost d'ambiant. Les objets personnalisés peuvent fixer `spotlightRange` et angle de cône — un mode « faisceau tenu en main » dont le cône suit la caméra. Les packs ne peuvent connaître la direction du faisceau.

Les blocs personnalisés peuvent porter `skyLightEmission` (0–15), qui **injecte dans le propre canal skyLight, à part du BFS de blockLight**. Les packs style R9.12 jugeant soleil/ombre par seuil skyLight peuvent faillir en mondes à skyLight relevé par lumières artificielles. Les packs de distribution jugent plus robuste combiné avec blockLight.

## 27. Détails de pipeline

- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente le test d'écart directement. Les matériaux cutout (herbe, feuilles) permettent des effets de dissolution type dither (recette R-C). En liquides (mélange) `out.alpha` est la transparence réelle (recette R-D). Sans effet en terrain opaque normal — ne pas confondre
- **Contenu de `l.ambient`** : `material.ambient × sceneAmbient`, distinct par matériau. Le côté scène attache au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne programmez jamais de défauts fixes
- **Les lumières directionnelles de la scène forment un rig à 2 lumières** : la somme Lambert de la lumière principale (direction issue de la position du soleil réglée dans la skybox, intensité 1.0) et de la lumière de remplissage (direction `[-0.5, -1, -1]`, intensité 0.35) arrive dans `l.directional`. La lumière de remplissage pointe vers le bas : elle n'ajoute rien aux faces vers le haut et rattrape les surfaces tournées vers le bas (plafonds de grottes etc.). Le terrain ne considère que les lumières ajoutées dans `_initScene` ; celles ajoutées après le démarrage sont ignorées du terrain et des modèles de blocs (un message d'avertissement officiel le dit)
- **`bloxdTime()` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `bloxdSunDirection()` en mondes à cycle jour/nuit
- **Les fonctions d'en-tête lisent un seul uniform** : le moteur place un uniform de 64 octets à `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), et `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondent à la lecture de ces slots. `originOffset` vaut toujours `[0, 0, 0]` dans le build actuel (slot réservé pour les coordonnées monde en virgule flottante). Un pack ne peut pas écrire cet uniform, et comme le WGSL du pack et celui du moteur fusionnent en un seul module, déclarer soi-même le même group/binding est également impossible. (La v3 renomme les deux slots — `seconds` / `renderOffset`, exposés sous les noms `bloxdSeconds()` / `bloxdRenderOffset()` — et ajoute la texture de profondeur de scène à `@group(3) @binding(1)` ; voir [Partie IX](09-apiv3.md) §41 et §51.)
- **Les données vertex sont construites par le mesher (Web Worker)** : le terrain de blocs est entrelacé à 28 octets par vertex (32 octets quand l'atlas est actif) — position = float32×3 / normale = entier signé 8 bits×4 / couleur = entier normalisé 8 bits×4 (la substance de `s.colour` — teinte × AO est cuite en 8 bits à l'étape mesher, la séparer ou la restaurer côté pack est donc impossible par principe) / UV = float32×2 / atlasIndex = float32. Seuls les niveaux de lumière voyagent dans un buffer vertex séparé de 4 octets ([Partie VII](07-internals.md) §26, [Partie II](02-api.md) §11). Les vertices sont dessinés en instanciation par chunk
- Les fins damiers aux bords de chunk au chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack (désactivable via le réglage graphique `chunkFadeIn`)
- **`mod` est un mot réservé** : rejeté avec `pack.wgsl:3 'mod' is a reserved word in WGSL.` Écrivez les restes avec l'opérateur `%`

### R-C. Dissolution par dither Bayer — out.alpha contrôle discard

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fondu d'eau proche caméra — l'alpha liquide dégage la vue

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

## 28. Ce qui change les valeurs visibles du pack — liste de tests

Le même pack rend différemment selon **monde et réglages joueur**. Revoyez au moins ces 3 environnements avant de distribuer :

1. **Monde normal** (skybox default, sans overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (« couleur la plus sombre visible ». Implémenté comme un max par composante contre `uSkyLightColour` et `uAmbientLightColour` à la fois ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu, et la couleur de ciel elle-même est relevée) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `l.fogVisibility` suit les réglages de brouillard/distance de chunks du joueur. Autres facteurs de variation par monde : `cameraTint` (teinte RGBA sur tout l'écran) et `proximityFadeDistance` / `proximityFadeMinOpacity` (fondu de proximité caméra pour les entités) — `cameraTint` en particulier est une passe finale composée **par-dessus** la sortie du pack. Beaucoup de ces réglages passent aussi par l'API script (`serverOption`) et se mettent à jour en cours de partie.

## 29. Moyens de débogage

- Paramètre URL `?renderer=lite` — force le moteur Lite (`?renderer=webgl2` / `babylon` valent aussi ; `babylon` = ancien nom de webgl2). La priorité : paramètre URL > localStorage `bloxdRenderer` > écran de réglages > défaut (webgl2). Les valeurs invalides sont ignorées avec un avertissement. Des overrides restants dans l'URL ou le localStorage peuvent casser des scènes nécessitant WebGPU (lite) avec `needs the new WebGPU renderer, so remove the renderer override...` ([Partie V](05-troubleshooting.md) §17)
- Paramètre URL `?vconsole` — console à l'écran (VConsole). Utile en vérification mobile réelle
- Paramètre URL `?drawcalls=1` — ajoute un panneau de debug des statistiques de draw. Sélectionnez des objets de jeu dans la console de debug, ou utilisez `drawCalls()` / `why()` / `configureDrawCallWatching()`, pour inspecter le surdessin des gros mécanismes (pack ou autres) et l'approche du plafond de ~65 000 sommets par draw — utile pour isoler les goulots de performance
- La console affiche `noa-engine v0.33.0` et `Renderer: lite from <source>` — revoyez-les d'abord pour ne pas mal diagnostiquer la voie de rendu
- Le moteur WebGPU se verrouille « forcé ON » avec pack appliqué. Le réglage « Disable Block Texture Atlas » se verrouille aussi (l'atlas reste ON), et sans WebGPU le pack n'applique même pas. Base pour écrire « navigateur WebGPU requis » en pages de distribution
- Les textures de blocs sont une texture tableau 2D (`texture_2d_array`), et le sampler du terrain est nearest + repeat. Le mesher fusionne aussi les faces aux material / AO / lumière identiques en un rectangle (**greedy meshing**), si bien qu'une face fusionnée peut avoir une UV dépassant la largeur d'une tuile (bords rentrés de 0.0015). L'adressage repeat matériel gère le raccord, donc les faces fusionnées paraissent sans couture. Notez qu'un détail procédural accroché à `vUV` peut casser aux frontières de fusion — accrochez-le plutôt à la position monde (`s.position` + `bloxdOriginOffset()`)
- La revalidation runtime par partie (`checkCompilation`) compile des matériaux de terrain réels en WebGPU du navigateur (plus stricte que la validation statique de réglages). Les packs qui échouent ici s'excluent de ce jeu

## 30. Modes d'application par jeu (`shaderPackPolicy`)

Cette section fixe ce que signifie `allow / strict` au niveau du titre (cf. §7). Seuls les titres dont la définition du jeu porte explicitement `shaderPackPolicy: "allow"` fonctionnent en mode complet (hooks vertex, `discard`, `alpha` de terrain) ; les titres sans valeur (ou avec une valeur autre que allow) sont stricts : `BLOXD_STRICT` est défini et le code entouré de gardes est désactivé automatiquement. Le paquet ne peut pas choisir cela — savoir quels titres exécutent quoi est un prérequis de la distribution.

- Build de référence : `szby6g.main.94a7596c.js` (déploiement en production au 2026-10-17). L'énumération statique des 111 définitions de jeu donne **26 entrées allow (12 titres) / 85 entrées strictes**.
- Au-dessus de `shaderPackPolicy` existe un verrou de canal de distribution (en gros `canUseShaderPacks`) : via des portails externes (par ex. les builds Coolmath Games), le système de packs de shaders lui-même peut être désactivé avant même que `shaderPackPolicy` soit consulté. L'analyse allow/strict ci-dessous porte sur le build web principal de bloxd.io.
- allow est déclaré en 12 endroits : 8 littéraux directs dans les définitions de jeu et 4 variables de base (`tb` / `kz` / `cb` / `Fb`) ; les variantes l'héritent par spread (`{...tb,...}`). Aucune surcharge par variante n'existe à ce jour (pas non plus de motif inverse parent-allow / enfant-strict).

Les 12 titres allow (26 entrées au total) :

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entrées)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 titres isolés** : Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Côté strict, les points les plus trompeurs :

- **Superflat Creative (classic_creativeFlat) est strict.** Le nom contient « Creative », mais dans la famille classic seul le Creative habituel (`classic_creative`) est allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. sont tous stricts
- **Custom Games (customGames) est strict.** Les effets de hooks vertex ne se déclenchent pas dans les jeux personnalisés créés par l'utilisateur. Pour le travail de vérification, Test Gym est le choix sûr
- Les titres majeurs PvP / serveur comme bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sont tous stricts

Notez qu'en titres stricts le paquet reste chargé et compilé, et que les recettes côté fragment comme surface / light fonctionnent normalement. Ce qui est limité : les hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, et la `alpha` de terrain (en liquides elle existe toujours).

Cette liste reflète l'analyse statique du build cité ; des mises à jour du moteur peuvent modifier la répartition allow/strict. À revérifier à chaque nouvelle version.

[← Partie précédente](06-implementation.md)·[Retour au manuel](README.md)·[Partie suivante →](08-apiv2.md)
