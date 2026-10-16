[← Partie précédente](implementation.md)·[Retour au manuel](README.md)·[Partie suivante →](apiv2.md)

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

Le calcul du brouillard est toujours en mode LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `l.fogVisibility` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (recette R-B).

Couleur de brouillard par défaut `rgb(183, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, l.fogVisibility)` est sûre car la couleur de brouillard ne sert pas à fogVisibility 1.

Régler `showFog` à false pousse le brouillard à 3200–3328 blocs, le désactivant de fait (`fogVisibility ≈ 1` continue à venir).

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

En décodant `aPackedLightLevels`, le moteur met à chaque canal un **plancher de 35 % du canal RVB le plus brillant**. P. ex. une « lumière rouge pure » monte à (1,00, 0,35, 0) en sommets avant interpolation et lift. L'orange de torche paraissant « rose blanchâtre plutôt que rouge » vient d'ici — réglez la saturation des recettes de torche chaude (R9.1) contre ce défaut.

La lumière de main (`heldLight`) a une portée selon le canal le plus brillant (max 15 blocs) avec prétraitement `dist^0.75`, le même plancher 35 %, et `l.heldLight` est la valeur **pré**-boost d'ambiant. Les objets personnalisés peuvent fixer `spotlightRange` et angle de cône — un mode « faisceau tenu en main » dont le cône suit la caméra. Les packs ne peuvent connaître la direction du faisceau.

Les blocs personnalisés peuvent porter `skyLightEmission` (0–15), qui **injecte dans le propre canal skyLight, à part du BFS de blockLight**. Les packs style R9.12 jugeant soleil/ombre par seuil skyLight peuvent faillir en mondes à skyLight relevé par lumières artificielles. Les packs de distribution jugent plus robuste combiné avec blockLight.

## 27. Détails de pipeline

- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente le test d'écart directement. Les matériaux cutout (herbe, feuilles) permettent des effets de dissolution type dither (recette R-C). En liquides (mélange) `out.alpha` est la transparence réelle (recette R-D). Sans effet en terrain opaque normal — ne pas confondre
- **Contenu de `l.ambient`** : `material.ambient × sceneAmbient`, distinct par matériau. Le côté scène attache au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne programmez jamais de défauts fixes
- **`bloxdTime()` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `bloxdSunDirection()` en mondes à cycle jour/nuit
- Les fins damiers aux bords de chunk au chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack
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

1. **Monde normal** (skybox default, sans overrides) — bloxdSunDirection() présent, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (plancher « couleur la plus sombre visible » sur sky et ambient ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `l.fogVisibility` suit les réglages de brouillard/distance de chunks du joueur.

## 29. Moyens de débogage

- Paramètre URL `?renderer=lite` — force le moteur Lite (`?renderer=webgl2` / `babylon` valent aussi)
- Paramètre URL `?vconsole` — console à l'écran (VConsole). Utile en vérification mobile réelle
- La console affiche `noa-engine v0.33.0` et `Renderer: lite from <source>` — revoyez-les d'abord pour ne pas mal diagnostiquer la voie de rendu
- Le moteur WebGPU se verrouille « forcé ON » avec pack appliqué. Le réglage « Disable Block Texture Atlas » se verrouille aussi (l'atlas reste ON), et sans WebGPU le pack n'applique même pas. Base pour écrire « navigateur WebGPU requis » en pages de distribution
- La revalidation runtime par partie (`checkCompilation`) compile des matériaux de terrain réels en WebGPU du navigateur (plus stricte que la validation statique de réglages). Les packs qui échouent ici s'excluent de ce jeu

## 30. Modes d'application par jeu (`shaderPackPolicy`)

Cette section fixe ce que signifie `allow / strict` au niveau du titre (cf. §7). Seuls les titres dont la définition du jeu porte explicitement `shaderPackPolicy: "allow"` fonctionnent en mode complet (hooks vertex, `discard`, `alpha` de terrain) ; les titres sans valeur (ou avec une valeur autre que allow) sont stricts : `BLOXD_STRICT` est défini et le code entouré de gardes est désactivé automatiquement. Le paquet ne peut pas choisir cela — savoir quels titres exécutent quoi est un prérequis de la distribution.

- Build de référence : `szby6g.main.94a7596c.js` (déploiement en production au 2026-10-17). L'énumération statique des 111 définitions de jeu donne **26 entrées allow (12 titres) / 85 entrées strictes**.
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
