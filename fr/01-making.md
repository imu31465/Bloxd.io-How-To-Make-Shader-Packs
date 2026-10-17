[Retour au manuel](README.md)·[Partie suivante →](02-api.md)

# Partie I : Créer des packs

## 1. Aperçu et prérequis

- Les packs de shaders sont **réservés au moteur WebGPU**. Tant qu'un pack est installé, le moteur WebGPU est activé de force dans les réglages
- Les packs s'écrivent dans un **sous-ensemble restreint de WGSL**. Ils n'affectent que l'aspect du **terrain et des liquides**
- Ce que vous pouvez faire : changer couleurs, transparence et émission ; reconstruire l'éclairage ; ombres façon projection (R9.12) ; animation de sommets (certains jeux seulement)
- Ce que vous ne pouvez pas faire : ajouter/échantillonner des textures, post-traitement (bloom etc.), ombres pixellisées tournant avec le soleil (shadow maps) ni reflets réels (SSR), ni toucher le ciel ou les entités
- Ce que vous pouvez faire (mais souvent oublié) : **ombres façon projection avec `skyLight` (occlusion du ciel par voxels)** — assombrir nettement sous les arbres et les toits (R9.12). Casser des blocs fait recalculer LightEngine aussitôt : les ombres suivent en temps réel
- **La plupart des jeux sont en mode strict** (ni animation de sommets, ni `discard`). Concevez les packs grand public pour le mode strict

## 2. Démarrage rapide

1. Créez un dossier avec `pack.json` et des fichiers `.wgsl`
2. Chargez le zip ou le dossier via réglages du jeu → Shader Pack
3. Corrigez les erreurs et rechargez (voir [Partie V](05-troubleshooting.md))
4. Testez dans des jeux compatibles
5. Zippez quand c'est fini et distribuez

## 3. Structure du pack

- **Format de distribution** : un seul `.zip`, ou un dossier (le chargement de dossier est réservé aux navigateurs de bureau)
- **Contenu** : un `pack.json` (à la racine du pack ; insensible à la casse) + 1 à 256 fichiers `.wgsl`
- Les `.wgsl` multiples sont concaténés et traités comme un module : découpage et sous-dossiers libres. Aucune contrainte de noms. Les fichiers non `.wgsl` (READMEs etc.) sont ignorés
- Astuce de compression : si un zip range tout sous un dossier racine commun, ce préfixe est retiré automatiquement (les zips "Compresser" de macOS passent tels quels). Mais des fichiers parasites à la racine cassent la détection du niveau supérieur ; le plus sûr est d'entrer dans le dossier et de compresser `pack.json` et les `.wgsl` directement (vérifiez que `pack.json` est à la racine du ZIP)

| Élément | Limite |
|---|---|
| taille du zip / nb d'entrées | 32 Mo / 1024 |
| taille de pack.json | 64 Ko, UTF-8 |
| taille totale .wgsl | 256 Ko, UTF-8 |
| format zip | zip64, découpés et chiffrés refusés |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Champ | Requis | Description |
|---|---|---|
| `apiVersion` | requis | Doit correspondre exactement à `2`. Les packs `1` sont refusés avec `shaderPack:loadWrongApiVersion` |
| `name` | requis | Non vide. Affiché dans l'interface des réglages |
| `author` | optionnel | Omissible. Les valeurs non-chaînes (nombres etc.) sont des erreurs |

Les autres champs sont ignorés.

## 5. Modèle minimal

Un pack fonctionnel avec juste `pack.json` (section 4) et ce `pack.wgsl` :

```wgsl
// Pack minimal à légère teinte chaude
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Règles à suivre :

- Ne **construisez jamais les structs de sortie directement** (`BloxdSurface(...)` est une erreur). Partez toujours de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` et modifiez les champs. Exception : le premier paramètre du hook light (`s: BloxdSurface`) a le type de sortie : `var out = s;` vaut aussi
- `var x: BloxdSurface;` sans initialiser (annotation de type seule) est aussi une erreur
- Les paramètres des hooks sont en **lecture seule**. Pour les changer, copiez d'abord, p. ex. `var sv = s;`
- Interdit d'utiliser le préfixe `bloxd_` dans vos identifiants (sauf les 6 noms de hooks)
- Écrivez les constantes avec `const` (`#define` n'accepte pas de valeurs)

## 6. Les 6 hooks

Tous optionnels. Les signatures doivent correspondre exactement en types (noms de paramètres libres).

| Hook | Rôle |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Animation des sommets du terrain. **Indisponible en mode strict** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Couleur, transparence et émission du terrain. `s.colour` = texture × couleur de sommet |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Couleur finale du terrain. Appelé à **l'étape finale du fragment** : sa valeur de retour devient la couleur finale telle quelle |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (mêmes formes) | Versions liquides. `alpha` agit comme transparence du liquide |

Règles de repli :

- Sans hook liquide, **le hook terrain de même nom est utilisé** (jamais l'inverse). Écrire seulement surface applique le même effet aux liquides
- Sans hook light, le comportement par défaut s'applique (`engineColour + emission × fogVisibility`)
- Si vous écartez `engineColour` pour reconstruire depuis la couleur de base, réappliquez le brouillard vous-même : `mix(l.fogColour, col, l.fogVisibility)`. En ajoutant de l'émission, multipliez-la d'abord par `fogVisibility`

## 7. 8 variantes et gardes

Vous écrivez un seul code, mais il doit compiler dans les **8 combinaisons {strict, allow} × {éclairage on, éclairage off} × {terrain, liquide}**.
Seuls `#define` (drapeau seul, sans valeurs) / `#ifdef` / `#ifndef` / `#else` / `#endif` existent. `#` doit ouvrir sa ligne (y compris dans les fonctions).

| Garde | Sens | Usage |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Hors strict (allow) uniquement | Entoure tout le hook vertex et `discard` |
| `#ifdef BLOXD_LIGHTING` | Éclairage activé uniquement | Entoure le code touchant `blockLight`, `skyLight`, `ambientLightColour`, etc. **Entourez les fonctions auxiliaires partagées (fn de portée module) comme fonctions entières** (protéger seul le site d'appel ne suffit pas) |
| `#ifdef BLOXD_ALPHA` | Quand le champ `alpha` existe (toujours en liquides, terrain en allow seulement) | Entoure le code touchant `alpha` |

## 8. Fonctionnalités du langage et interdictions

Disponible :

- Fonctions intégrées WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, etc.)
- Vos propres `fn` / `struct` / `const` / `alias` / `var<private>`, plus `let` et contrôle de flux (if/for/while/switch etc.) dans les fonctions
- Dérivées (`dpdx` / `dpdy` / `fwidth`) uniquement en hooks surface/light (étape fragment). Pas en vertex
- Tableaux `const` (ex. LUTs de palette), pointeurs (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- Définitions de drapeaux `#define NOM` + branchement `#ifdef`

Interdit / prudence :

- **Pas de textures** : types `texture_*` / `sampler` inutilisables. Construisez le détail en procédural (bruit de hachage etc.)
- **`discard` interdit en mode strict** (entourez avec `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` interdits. Comme `enable f16;` ne peut s'écrire, **les types f16 sont de fait inutilisables**
- Les attributs `@builtin` sont aussi interdits : `fragCoord` (coordonnées écran) et `vertex_index` illisibles
- **Pas de `let` en portée module** (utilisez `const` ou `var`)
- `atomic` inutilisable
- Les coordonnées sont en local-noa. Ajoutez `bloxdOriginOffset()` pour le monde. Coordonnées de bloc : `bloxdFaceBlock(position, normal)`

## 9. Validation, tests et distribution

Le chargement exécute ces contrôles dans l'ordre :

1. Contrôles de limites du chargeur (plafonds de la section 3)
2. Compilation statique (les 8 variantes)
3. Compilation réelle dans le WebGPU du navigateur (la validation statique ne vérifie pas tous les types ; certains codes n'échouent qu'ici — évitez les pièges de la section 8)

Étapes :

1. Chargez le zip / dossier via réglages → Shader Pack
2. Vérifiez le statut. Le succès, c'est "Ready to use". Face à "Saved, but it won't run until you fix these errors...", corrigez les erreurs listées (fichier:ligne + variante) et rechargez
3. Rechargez la page pour activer. Supprimez avant tout forçage de moteur (renderer override) en paramètres URL ou localStorage, sinon le pack refusera de démarrer
4. Testez d'abord en jeux permissifs puis en jeux stricts (la majorité). L'animation de sommets ne marche qu'en jeux allow
5. Pour distribuer, zippez avec `pack.json` au sommet (dans les limites de la section 3). Recharger le même écran remplace le pack ; Remove Pack le supprime. La revalidation après mises à jour du jeu tourne seule au chargement de page
