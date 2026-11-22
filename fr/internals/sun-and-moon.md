# Le soleil et la lune

> API cible : 5 · Type : référence technique
`bloxdSunDirection()` lit un tampon contenant la direction du soleil, mis à jour uniquement lorsque le type de skybox change. Le critère déterminant n'est pas la présence visible du soleil dans le ciel, mais **le fait que la skybox soit de type `earth`**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (ciel procédural) | Non nul (défauts ci-dessous) |
| `gloomy` / `interstellar` / `space_*` (textures cubiques) | **Toujours (0,0,0)** |

Lorsque `bloxdSunDirection()` renvoie un vecteur non nul, la direction de la lune est `-bloxdSunDirection()` (le moteur la place exactement à l’opposé du soleil). Si la fonction renvoie zéro, elle ne permet pas de connaître la direction réelle de la lune. La nuit se détermine à partir de la hauteur du soleil : la lune est au-dessus de l’horizon lorsque `bloxdSunDirection().y < 0` (le soleil est sous l’horizon). Dans les mondes par défaut, le soleil est immobile et la lune l’est aussi ; elle ne se déplace que dans les mondes qui implémentent un cycle jour/nuit.

La direction du soleil des mondes par défaut vaut environ `(-0.56, 0.81, -0.18)` (vecteur unitaire statique calculé à partir de `inclination` = −0.2 et `azimuth` = 0.55). Une référence utile pour estimer la direction des reflets pendant les tests de packs.

Le moteur n'intègre pas de cycle jour/nuit. `inclination` reste une valeur statique ; les mondes qui implémentent un cycle dynamique la mettent à jour dans leur logique de jeu. `bloxdSunDirection()` reflète chaque mise à jour.

L'éclairage directionnel du terrain se limite à deux sources créées au démarrage de la scène. Leur **direction et leur intensité restent constantes, de jour comme de nuit**. Autrement dit, la luminosité du terrain ne varie pas avec l'heure ; l'apparence du jour et de la nuit dépend uniquement de la skybox et de `bloxdSunDirection()`. Les packs qui assombrissent le terrain la nuit doivent donc estimer l'heure à partir de `bloxdSunDirection()`, comme avec la technique `sunPresent` de [Concevoir des ambiances nocturnes](../guides/night.md).

## R-A. Clair de lune

Ajoute un éclairage diffus de Lambert blanc bleuté et un léger reflet spéculaire uniquement lorsque la lune est au-dessus de l'horizon. Dans les mondes par défaut où le soleil reste fixe, `moonUp` vaut 0 et aucun effet ne se produit. **L'effet de clair de lune ne s'active que dans les mondes qui implémentent un cycle jour/nuit.**

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // La lune est à l’opposé du soleil uniquement si le vecteur solaire n’est pas nul.
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
