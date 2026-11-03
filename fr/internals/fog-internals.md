# Intérieurs du brouillard

> API cible : 5 · Build cible : `ab90qa` (2026-11-03, production) · État : Analyzed (analyse JavaScript du bundle de production)
Le calcul du brouillard est toujours en mode LINEAR (équivalent à `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de distance de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé du brouillard ne fait que 32 blocs de large**, et `l.fogAlpha` est moins une « brume de distance » qu'une **distance normalisée au bord du monde chargé**. Elle varie par joueur selon la distance de chargement : les effets fondés sur la distance doivent donc calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (la section « Bande de bord de chargement » ci-dessous). (la fonction de brouillard du renderer implémente en réalité **quatre** modes — désactivé / exponentiel / exponentiel au carré / linéaire — et les titres livrés pilotent le linéaire ; la source restaurée et l'argument de robustesse sont préservés dans [Historique des versions : v3](../history/v3.md).)

La couleur de brouillard par défaut est `rgb(183, 191, 195)` (gris-bleu pâle). Les créateurs de mondes peuvent la changer via `fogColourOverride` (hex). Avec le mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `bloxdApplyFog(col, l)` est sûre puisque la couleur de brouillard n'est pas utilisée quand fogAlpha vaut 0. L'API script a deux options de plus, `fogChunkDistanceOverride` et `fogOnSkybox` : les jeux personnalisés peuvent régler indépendamment la distance de brouillard (la valeur D) et l'application du brouillard à la skybox. Par défaut la skybox n'est pas affectée par le brouillard (seuls les jeux activant `fogOnSkybox` teintent aussi la skybox avec la couleur de brouillard).

Régler `showFog` à false côté joueur pousse le brouillard à 3200–3232 blocs, le désactivant de fait (`fogAlpha ≈ 0` continue d'être renvoyé).

## Bande de bord de chargement — fogAlpha en « bord du monde »

Refroidit discrètement juste la bande de 32 blocs du bord de chargement pour estomper le bord du monde (ou l'accentuer en effet). Sans distance calculée soi-même, donc suit automatiquement les réglages de distance de chargement du joueur.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha : 0 = à l'intérieur (marge jusqu'au bord), 1 = sur le point de franchir le bord
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
