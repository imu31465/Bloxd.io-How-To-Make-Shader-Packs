# Le soleil et la lune

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Analyzed (analyse JavaScript du bundle de production)
La source de `bloxdSunDirection()` est un tampon de direction solaire réécrit uniquement quand le type de skybox change — le critère n'est pas « si le ciel a un soleil » mais **« si la skybox est de type terre »**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (ciel procédural) | Non nul (défauts ci-dessous) |
| `gloomy` / `interstellar` / `space_*` (textures cubiques) | **Toujours (0,0,0)** |

**La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position de la lune comme l'opposé exact du soleil). La nuit se juge par la hauteur du soleil — la lune est levée quand `bloxdSunDirection().y < 0` (soleil sous l'horizon). Mais dans les mondes par défaut le soleil est statique, donc la lune l'est aussi ; seuls les mondes implémentant un cycle jour/nuit la voient bouger.

La direction du soleil des mondes par défaut vaut environ `(-0.56, 0.81, -0.18)` (vecteur unitaire calculé depuis inclination = −0.2 / azimuth = 0.55, statique). Une référence pratique pour prédire sur papier les directions de reflet en testant des packs de distribution.

Les cycles jour/nuit ne sont pas intégrés au moteur — l'inclination est un nombre statique, et les mondes à jour/nuit mobile l'actualisent côté jeu. `bloxdSunDirection()` suit chaque mise à jour.

Les lumières directionnelles du terrain ne sont que 2 lampes créées au démarrage de la scène, à **direction et intensité fixes, inchangées jour et nuit**. En bref : **aucun facteur de luminosité du terrain ne dépend du temps. Les « looks » jour/nuit viennent uniquement de la skybox et de bloxdSunDirection()** — les packs assombrissant le terrain la nuit doivent donc estimer eux-mêmes la tranche horaire depuis bloxdSunDirection() (la technique `sunPresent` de [Conception des looks nocturnes](../guides/night.md)).

## R-A. Clair de lune directionnel — moonDir = −bloxdSunDirection()

Ajoute du Lambert blanc bleuté et un faible specular uniquement pendant que la lune est levée. `moonUp` vaut 0 dans les mondes par défaut à soleil statique, donc rien ne s'y passe — **clair de lune qui ne se déclenche que dans les mondes à cycle jour/nuit, donc sûr**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // la lune est toujours exactement à l'opposé du soleil ; auto-extinction en journée via moonDir.y < 0
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
}
    return out;
}
```
