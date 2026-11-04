# Démarrage rapide

> API cible : 5 · Build cible : `xkg8x` (vérifié en production le 2026-11-04) · État : Verified

Votre premier pack en cinq minutes.

## 1. Créez les fichiers

Créez un dossier contenant `pack.json` et `pack.wgsl` :

**`pack.json`** :

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — un pack minimal de teinte chaude :

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> L'en-tête du moteur (constantes, structures, fonctions) est préfixé automatiquement à chaque pack au chargement — vous ne l'écrivez jamais vous-même. L'en-tête complet est reproduit dans [Engine Internals](../internals/engine-header.md).

## 2. Chargez-le dans le jeu

1. Ouvrez Réglages → Shader Pack et chargez le zip ou le dossier (le chargement par dossier n'existe que sur navigateurs de bureau)
2. Vérifiez le statut : juste après l'avoir sélectionné, vous verrez "Ready. Reload the page to use it." — après un **rechargement de la page**, "Ready to use" signale le succès
3. Si vous voyez "Saved, but it won't run until you fix these errors...", corrigez les erreurs listées (fichier:ligne + variante) et rechargez

## 3. Vérifiez

1. Testez d'abord dans un jeu permissif
2. Puis dans un jeu en mode strict (la plupart des jeux sont stricts)
3. L'animation de sommets ne fonctionne que dans les jeux marqués allow

## 4. Distribuez

Zippez le tout — voir [Distribution](distribution.md).

## Bloqué ?

- Ce que signifient les erreurs → [Dépannage](../troubleshooting/)
- Comment écrire des hooks → [Hooks de shader](hooks.md)
- Le gabarit complet à 9 hooks se trouve dans la page suivante, [Hooks de shader](hooks.md)
