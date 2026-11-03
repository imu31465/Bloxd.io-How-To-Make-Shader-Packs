# Intérieurs du brouillard



Le calcul du brouillard est toujours en mode LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `(1.0 - l.fogAlpha)` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (recette R-B). (Note v3 : la fonction de brouillard du moteur implémente en réalité **quatre** modes — désactivé / exponentiel / exponentiel au carré / linéaire — et les titres livrés avec le jeu pilotent le mode linéaire ; le code restauré et l'argument de robustesse se trouvent dans la [Partie IX](../history/v3.md) §50.)

Couleur de brouillard par défaut `rgb(183, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, (1.0 - l.fogAlpha))` est sûre car la couleur de brouillard ne sert pas à fogVisibility 1. L'API script propose deux options de plus, `fogChunkDistanceOverride` et `fogOnSkybox` : les Custom Games peuvent régler indépendamment la distance de brouillard (la valeur D) et l'application du brouillard à la skybox. Par défaut la skybox n'est pas affectée par le brouillard (seuls les jeux activant `fogOnSkybox` teintent aussi la skybox avec la couleur de brouillard).

Régler `showFog` à false pousse le brouillard à 3200–3232 blocs, le désactivant de fait (`fogVisibility ≈ 1` continue à venir).

## R-B. Bande de bord de chargement — fogVisibility en « bord du monde »

Refroidit en silence juste la bande de 32 blocs du bord de chargement pour estomper la fin du monde (ou l'accentuer en effet). Sans distance autocalculée : suit auto les réglages de distance de chargement du joueur.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility : 1 = dedans (marge au bord), 0 = sur le point de sortir du bord
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
