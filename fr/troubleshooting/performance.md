# Performance

> API cible : 5 · État : Verified

Problèmes de vitesse et leurs corrections.

## Le contrôle sur appareil ne se termine jamais et écarte le pack

- **Cause** : le contrôle a un **délai impératif de 60 secondes** (le dépassement est traité comme `skipped`) — courant sur les appareils peu puissants et les mondes lourds
- **Correction** : réduisez le travail lourd sur les sommets et les boucles complexes, puis réessayez
- **Prévention** : suivez le [guide de performance](../guides/performance.md)

## Baisse de la fréquence d'images

- **Vérification** : comparez les FPS avec et sans le pack ; mesurez séparément les scènes riches en terrain et l'eau
- **Causes typiques** : effets lourds sur chaque face sans condition (aucune sélection par flag/distance) ; bruit de hash haute fréquence ; grands exposants de `pow`
- **Corrections** ([le guide](../guides/performance.md)) :
  - réservez les effets aux faces qui en ont besoin via `flags`
  - sortie anticipée par distance (`distance(surface.position, bloxdEyePosition())`)
  - échantillonnez un mip au-dessus pour des lectures `bloxdTexel` moins coûteuses
- **Prévention** : ajoutez le détail progressivement et comparez les FPS ([tests](../guides/testing.md))

## Lent seulement sur mobile

- **Cause** : les packs tournent sur le renderer WebGPU ; les GPU mobiles peuvent être des dizaines de fois plus lents que ceux de bureau
- **Correction** : réduisez la force/la fréquence des effets, renforcez l'élagage par distance — ou indiquez clairement que le mobile n'est pas pris en charge ([Prérequis](../getting-started/requirements.md))

## À l'approche de la limite de 256 Ko du pack

- **Correction** : allégez les commentaires, factorisez le code partagé en fonctions, supprimez les recettes inutilisées ([Structure du pack](../getting-started/pack-structure.md))

## Voir aussi

- [Guide de performance](../guides/performance.md) · [Tests](../guides/testing.md)
