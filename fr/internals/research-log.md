# Journal de recherche

> État : Analyzed

Cette page explique comment lire les notes techniques portant sur l'implémentation du jeu. Le comportement interne ne constitue pas un contrat d'API public et peut changer avec les mises à jour.

## Principes de recherche

1. **Vérifier le comportement observable** — confronter la documentation à la validation en jeu et au comportement à l'exécution.
2. **Distinguer implémentation et API** — séparer les fonctions accessibles aux shader packs des mécanismes utilisés uniquement à l'intérieur du moteur.
3. **Décrire l'origine des constats** — préciser l'opération du moteur à l'origine d'une valeur ou d'un comportement documenté.
4. **Ne pas présenter une déduction comme un fait** — distinguer observations, interprétations et questions non résolues.
5. **Ne pas confondre heure d'observation et date de publication** — une vérification effectuée pendant une enquête ne prouve pas quand une fonction a été déployée.

## Pages de référence

| Page | Contenu |
|---|---|
| [En-tête du moteur](engine-header.md) | Types, fonctions et constantes ajoutés aux packs |
| [Validation des shaders](shader-validation.md) | Règles de validation des packs |
| [Compilation WGSL](wgsl-compilation.md) | Comportement de la compilation |
| [Registre des textures](texture-registry.md) | Résolution et échantillonnage des noms de textures |
| [Politique par jeu](policy.md) | Restrictions propres à chaque jeu |
| [Relevé des données du moteur](engine-data.md) | API visible par les packs |

## Limites

- La disponibilité future des fonctions et structures internes n'est pas garantie.
- L'organisation du bundle et les identifiants internes ne font pas partie de la spécification de l'API.
- Privilégiez les API documentées pour les packs plutôt que les détails d'implémentation privés.
