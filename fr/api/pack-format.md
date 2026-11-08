# Format du pack

> API cible : 5 · Build cible : `v98qt8` (vérifié en production le 2026-11-08) · État : Verified (remesuré sur le chargeur en production)

Tout le modèle de pack sur une seule page — manifeste, limites du chargeur, uniform par frame. Pour la version pas à pas, voir [Prise en main](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `apiVersion` | number | requis | **doit être strictement égal à `5`** (`===`). Une chaîne `"5"` échoue et est signalée avec son orthographe JSON |
| `name` | string | requis | non vide après trim ; affiché dans les réglages |
| `author` | string | optionnel | doit être une chaîne s'il est présent |

Tout le reste du manifeste est ignoré. `pack.json` doit être exactement un objet JSON à la racine du zip.

## Limites du chargeur (remesurées sur le c53 en production)

| Limite | Valeur | Message en cas de dépassement |
|---|---|---|
| fichiers `.wgsl` par pack | 256 | `The pack has more than 256 .wgsl files.` |
| source `.wgsl` totale | 256 Ko | `The pack's .wgsl files are over 256 KB in total.` |
| taille de `pack.json` | 64 Ko | `pack.json is over 64 KB.` |
| taille du zip | 32 Mo | `The zip is over 32 MB.` |
| entrées du zip | 1 024 | `The zip has more than 1024 entries.` |
| forme du zip | — | zip découpé / zip64 / chiffré / compression non prise en charge : chacun rejeté avec son propre message ; tous les fichiers en UTF-8 valide ; exactement un `pack.json` ; aucun chemin en double |

## Vérification de la version d'API

Le chargeur compare `manifest.apiVersion !== 5` avec le `!==` strict de JavaScript. La constante de version `5` et le gabarit de l'en-tête vivent dans le même module (c55 / module 29836), donc la validation et l'en-tête qu'elle présuppose évoluent ensemble. Messages d'incompatibilité : voir [Compatibilité](compatibility.md).

## Uniform par frame : bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — toujours 64 octets, mais v5 a ajouté un membre (d'après le module de disposition de l'uniform en production) :

| Offset | Champ | Type | Remarque |
|---|---|---|---|
| 0 | `seconds` | `f32` | alimente `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1 quand l'éclairage bloc/ciel est actif ; alimente `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | alimente `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | alimente `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | alimente `bloxdEyePosition()` |

`lit` s'insère dans le padding que v4 avait déjà entre `seconds` et `renderOffset` (les offsets 4–15 étaient des trous d'alignement ; un `vec3i` exige un alignement de 16 octets, donc `renderOffset` reste à 16). La taille totale et tous les autres offsets sont inchangés. Le moteur l'écrit avec un seul `setUint32(4, lit ? 1 : 0)` — c'est un flag, pas un niveau de lumière (les noms côté JS de v4 `terrainLightLevels` / `terrainHeldLight` ont entièrement disparu du bundle).

**Ne référencez jamais l'uniform directement depuis un pack.** Utilisez-le à travers les fonctions de l'en-tête (`bloxdSeconds()` etc.). La visibilité des étapes est VERTEX|FRAGMENT, donc les fonctions de l'en-tête fonctionnent aussi depuis des fonctions à portée module et depuis les hooks de sommet.

## Disposition du groupe de bindings

| binding | Contenu |
|---|---|
| 0 | uniform `bloxdPackInputs` (64 o) |
| 1 | texture de profondeur de scène (variantes liquid) |
| 2 | buffer de stockage `bloxdSpTextureLayers` |

`minBindingSize` reste 64. La texture de profondeur (binding 1) est FRAGMENT-only, ce qui explique pourquoi `bloxdOpaqueBehind()` est réservé aux hooks surface/light.

## Concaténation wgsl

Les fichiers `.wgsl` multiples sont concaténés en un seul module en **ordre dictionnaire du nom de chemin**. Les déclarations à portée module sont indépendantes de l'ordre ; seul l'ordre d'initialisation des `var` peut compter. Les fichiers non-`.wgsl` sont ignorés.
