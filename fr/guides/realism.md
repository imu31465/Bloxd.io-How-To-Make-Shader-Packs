# Réalisme : deux écoles

> API cible : 5 · Build cible : `ab90qa` (2026-11-03, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
**École A : retouches additives (depuis defaultLight)** — utilisez `engineColour` (couleur terminée) comme base et ajoutez un éclat chaud ou un rim. Facile et sûr, mais le modèle d'éclairage reste celui par défaut.

**École B : rééclairage complet (depuis s.colour)** — écartez `l.engineColour` et reconstruisez l'éclairage depuis `s.colour` (albedo) et les matériaux bruts de LightIn. La vraie voie vers le réalisme. Quatre règles :

1. **Réappliquez le brouillard** : le hook light s'exécute après le brouillard, donc appliquez `mix(l.fogColour, col, (1.0 - l.fogAlpha))` vous-même (R9.10). Quand le brouillard est trop dense, posez-y un plancher avec `min(l.fogAlpha, 0.70)`. À l'inverse, mélanger plus de couleur de brouillard sur des packs basés sur engineColour produit un double brouillard qui blanchit le lointain
2. **Repli unlit** : passez à `defaultLight` hors `#ifdef BLOXD_LIGHTING`
3. **Protégez des fonctions partagées entières** : enveloppez dans `#ifdef BLOXD_LIGHTING`, comme fonctions complètes, les fonctions partagées prenant `BloxdLightIn` (protéger seulement les sites d'appel ne suffit pas)
4. **En l'absence de direction solaire** : si `bloxdSunDirection()` est nul, ne calculez pas de specular directionnel. `l.directional` est un scalaire de quantité de lumière, pas un vecteur de direction, donc il ne peut pas restaurer la direction du reflet. Basculez au besoin sur un ambiant faible sans direction. La direction de la lune est disponible via `-bloxdSunDirection()` (elle ne bouge que dans les mondes à cycle jour/nuit — [Le soleil et la lune](../internals/sun-and-moon.md))
