[← Partie précédente](troubleshooting.md)·[Retour au manuel](README.md)·[Partie suivante →](internals.md)

# Partie VI : Notes d'implémentation importantes

## 19. Corriger « ombres sombres mais surfaces brillantes » la nuit

Assombrir seules les ombres laisse la couleur terminée (`engineColour`) brillante sans soleil, et l'écart face/ombre devient contre-nature. Atténuez toute la couleur terminée.

L'exemple traite `bloxdSunDirection()` zéro comme nuit et le soleil directionnel comme jour, atténuant les couleurs terminées du terrain aux heures sombres. Où `blockLight` et `heldLight` sont forts, l'atténuation faiblit pour préserver les lampes proches comme les torches. `0.52` est une valeur de réglage — baissez pour des nuits plus noires.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // atténue la couleur terminée ; ajoute l'émission du matériau avec brouillard par défaut
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Limites de cette correction :** si `bloxdSunDirection()` se comporte en « direction unitaire avec soleil, zéro sans », jour/nuit se distinguent mais le couchant ne s'estime pas en douceur. Et comme elle atténue la couleur terminée, elle affaiblit ensemble lumière diurne et ambiant du moteur — pas une reproduction totale de l'horaire. Pour l'appliquer aux liquides, revoyez la relation de repli des hooks liquide.

## 20. Recette intégrée pour une eau d'aspect naturel

Cette API ne peut échantillonner la couleur de scène : c'est du **pseudo-rendu par mélange façon fresnel et reflets solaires, pas de vraie réflexion/réfraction**. Le calcul de profondeur est devenu possible en v2 avec `bloxdOpaqueBehind()` (détaillé en [partie VIII](apiv2.md) R-E). L'échantillon conserve la couleur de base, mélange un peu vers une couleur de ciel aux angles rasants et n'ajoute un petit reflet qu'avec soleil.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Pistes de réglage :

- Eau blanche/lavée : baissez `0.38` dans `fresnel * 0.38` et le reflet `0.55`.
- Eau trop sombre : mélangez un peu plus de `fakeSkyReflection`. En excès, aspect plastique.
- Lignes ou rayures régulières sur l'eau : baissez fréquences de vague et force de reflet. Ce code ne déplace pas de sommets de maille.
- Reflets réels du paysage : les entrées de cette API n'ont pas de couleur d'écran : mélanger des couleurs n'est jamais un vrai reflet (la profondeur est accessible en liquides seuls. [Partie VIII](apiv2.md) R-E).

Cette recette **remplace** un `bloxdLiquidLight` existant. Ne la collez pas avec la fonction d'onde homonyme de R9.7 ni d'autres hooks homonymes.

## 21. Liste de tests en jeu

Succès de compilation et « bel aspect » sont deux choses différentes. Vérifiez dans cet ordre :

1. **Chargement :** `pack.json` à la racine du ZIP ; les réglages affichent `Ready to use`.
2. **8 variantes :** sans oublis de gardes de types en strict / allow, éclairage on / off, terrain / liquide. Même si un jeu n'use que de certaines conditions, les packs de distribution doivent assumer les 8.
3. **Jour :** couleurs sans cramage par matériau (herbe, pierre, sable, bois) ; saut clair/sombre naturel entre dessus et côtés.
4. **Nuit :** comparez les mêmes matériaux en pleine lumière passée, ombres et près des torches. Si seules restent des faces éclairées, réglez l'atténuation d'exposition ; si tout s'assombrit, réglez la protection de lumière locale.
5. **Eau :** regardez depuis dessus, angles rasants, rives, sous l'eau et de nuit séparément. Comportement alpha et aspect sous-marin dépendent du compositing du jeu — ne jugez jamais d'un seul point de vue. Sous l'eau, le voile de définition liquide couvre devant selon ci-dessus : les différences du pack se voient surtout en surface et sur le terrain derrière le voile.
6. **Bords et distance :** sans sauts de vagues/motifs aux transitions de chunk / origine ; sans double brouillard ni brume blanche au loin.
7. **Performance :** effets lourds en hash/trig/`pow` par fragment au minimum. Ajoutez le détail peu à peu et comparez les FPS.

### Contraintes connues comme prémisses

- Les packs se limitent aux hooks terrain / liquide — sans traitement du ciel, des entités ou de l'UI avec le même code.
- Aucune entrée pour ajouter shadow maps, reflets en espace écran, réfraction, bloom, etc. (la profondeur de scène est débloquée en liquides seuls via `bloxdOpaqueBehind()`. Voir [partie VIII](apiv2.md)).
- `bloxdTime()` est un temps d'animation sans lien garanti avec le jour/nuit du jeu.
- Avec `bloxdSunDirection()` zéro, la vraie direction lunaire est inconnue, pas de la « physique de clair de lune » mais une approximation d'ambiance. Le clair de lune directionnel se construit depuis `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. [Partie VII](internals.md) R-A).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez `bloxdOriginOffset()` pour les effets dépendants du monde. Pour les motifs locaux du bloc, les coordonnées locales sont l'outil voulu.

## 22. Combiner avec d'autres packs quand le shader seul touche sa limite

Comme les packs ne peuvent ni ajouter ni échantillonner de textures, n'essayez pas de résoudre les fins reliefs de matériau ou les images du ciel par shaders seuls. Le dépôt public de packs de textures pour Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) gère textures, skybox, modèles, etc. par une autre voie.

Pour référence, des distributions communautaires « cinematic shader » analysées dans un cas se sont révélées être des packs de textures (textures 128x128 sans `pack.json` / `.wgsl`).

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

## 23. La réalité sous-marine avec les packs de shaders

Les looks sous-marins constent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light s'appellent normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné tout devant. Le réglage `cameraTint` gagne s'il existe | Non (ni couleur ni densité changeables) |
| ③ cameraTint | Réglage du jeu | Non |

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogVisibility ne le détecte pas non plus).
