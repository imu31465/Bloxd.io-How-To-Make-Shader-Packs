# Performance

> API cible : 5 · Build cible : `xkg8x` · État : Verified (pratique fondée sur la mesure)

Les hooks des packs s'exécutent sur chaque fragment (tous les pixels de terrain / liquide / modèle), donc les choix de style déplacent sensiblement la fréquence d'images.

## Premiers faits

- **Le hook light est l'étage final** : il s'exécute pour chaque pixel dessiné de terrain, liquide et modèle — la majorité de l'écran
- **Les packs tournent sur WebGPU** : évaluez le coût en supposant une gamme de GPU incluant le mobile
- Le plafond de taille du chargeur (256 Ko de `.wgsl`) est aussi un plafond **à la compilation** en pratique

## Échelle des coûts (peu coûteux → coûteux)

| Opération | Coût | Note |
|---|---|---|
| `mix` / `clamp` / arithmétique | ◎ minimal | |
| lectures d'entrées (`l.skyLight`…) | ◎ | issues d'uniformes/d'attributs de sommets |
| `smoothstep` / `pow` | ○ | `pow` varie selon l'exposant |
| `sin` / `cos` | ○ | la base de l'animation |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (échantillon de texture) | △ | moins cher aux mips supérieurs |
| `dpdx` / `dpdy` / `fwidth` | △ | hooks de surface/light uniquement |
| branchements (`if`) | △ | WGSL peut évaluer les deux côtés ; les conditions quasi uniformes (vérifications de flags) sont bon marché |
| bruit de hachage (beaucoup de `sin`/`fract`) | △ | conditionnez les effets de micro-relief à la distance |

## Pratique

1. **Réservez les effets aux faces qui en ont besoin** — la sélection par `flags` bat « +20 % partout »
2. **Lâchez le détail avec la distance** — sortez tôt quand `distance(surface.position, bloxdEyePosition())` dépasse un seuil
3. **Utilisez les mips** — `bloxdTexel(id, uv, mipLevel + 1.0)` est une moyenne à résolution ¼ ([exemples pratiques](../api/texture-api.md#exemples-concrets))
4. **Préférez les hooks de surface pour les retouches de couleur** — le hook light est l'étage final sur tous les pixels
5. **Ajoutez le détail par incréments et comparez les FPS** ([tests](testing.md))
6. **Les gardes `#ifdef` n'économisent pas l'exécution** — les variantes sont des unités de compilation ; les économies à l'exécution viennent des flags et de la distance

## Mesure

- Comparez les FPS avec/sans le pack via les devtools du navigateur (panneau de performance / statistiques WebGPU)
- Mesurez séparément les scènes riches en terrain (forêt riche en ombres) et l'eau (hooks de liquides)
- Vérifiez le matériel mobile — il peut être des dizaines de fois plus lent

## Voir aussi

- [Tests](testing.md) · [Pipeline de rendu](../internals/rendering-pipeline.md) · [API de textures](../api/texture-api.md)
