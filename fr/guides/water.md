# Rendre l'eau d'aspect naturel

> API cible : 5 · Build cible : `bny9u` (2026-11-05, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
Cette API ne peut pas échantillonner la couleur de scène : c'est donc du **stylisme pseudo par mélange de couleurs façon fresnel et reflets solaires, pas une vraie réflexion/réfraction** (le calcul de profondeur utilise le `bloxdOpaqueBehind()` en liquides seuls — la recette d'absorption par épaisseur est plus bas dans cette page). L'échantillon ci-dessous conserve la couleur de base, mélange légèrement vers une couleur de type ciel aux angles de vue rasants et n'ajoute un petit éclat que lorsqu'il y a du soleil.

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
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

Pistes de réglage :

- L'eau paraît blanche/lavée : baissez `0.38` dans `fresnel * 0.38` et l'éclat `0.55`.
- L'eau paraît trop sombre : mélangez un peu plus de `fakeSkyReflection`. En excès, l'aspect devient plastique.
- Lignes ou rayures régulières sur l'eau : baissez les fréquences de vagues et la force de l'éclat. Ce code ne déplace aucun sommet de maille.
- Vous voulez de vrais reflets du décor : les entrées de cette API n'ont pas de couleur d'écran, donc mélanger des couleurs ne devient jamais une vraie réflexion (la profondeur est en liquides seuls — voir [Fonctions : bloxdOpaqueBehind](../api/functions.md)).

Cette recette **remplace** un `bloxdLiquidLight` existant. Ne la collez pas aux côtés de la fonction de vague homonyme de R9.7 ni d'autres hooks homonymes.


## La réalité sous-marine avec les packs de shaders



Les looks sous-marins se composent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light sont appelés normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran généré depuis la couleur/l'alpha de définition du bloc liquide à la position de la caméra, dessiné tout devant. Le réglage de jeu `cameraTint` l'emporte s'il est défini | Non (ni couleur ni densité modifiables) |
| ③ cameraTint | Réglage de jeu | Non |

Points pratiques : les packs continuent de fonctionner sous l'eau / le voile ne peut pas être retiré / on ne peut pas brancher sur l'état sous-marin (fogStart / fogEnd / fogColour ne changent pas sous l'eau, donc fogAlpha ne peut pas non plus le détecter).
