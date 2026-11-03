# Erreurs de chargement

> API cible : 5 · État : Verified

Erreurs rejetées à l'**étape du chargeur** (la première barrière), affichées dans la ligne d'état des réglages avec des ids `shaderPack:load*`.

## "There's no pack.json at the top of the pack."

- **Cause** : pas de `pack.json` à la racine du zip (p. ex. le dossier a été zippé avec un niveau d'imbrication en trop)
- **Vérification** : ouvrez le zip — `pack.json` au niveau supérieur (ou directement sous un unique dossier racine commun)
- **Correction** : zippez `pack.json` et les fichiers `.wgsl` directement. Un unique dossier racine commun est retiré automatiquement ([Structure du pack](../getting-started/pack-structure.md))
- **Prévention** : gardez une procédure de zippage fixe ; la fonction « Compresser » de macOS fonctionne telle quelle (les fichiers parasites de l'OS sont exclus automatiquement)

## `loadDuplicateManifest` au chargement du zip

- **Cause** : deux fichiers `pack.json` (y compris des différences de casse)
- **Correction** : gardez-en exactement un

## Limites de taille et de nombre

| Message | Limite |
|---|---|
| `The zip is over 32 MB.` | zip de 32 Mo |
| `The zip has more than 1024 entries.` | 1 024 entrées |
| `The pack has more than 256 .wgsl files.` | 256 fichiers `.wgsl` |
| `The pack's .wgsl files are over 256 KB in total.` | 256 Ko au total |
| `pack.json is over 64 KB.` | manifeste de 64 Ko |

- **Correction** : supprimez les fichiers `.wgsl` inutiles / fusionnez des fichiers / allégez les commentaires
- **Prévention** : ces limites sont aussi des plafonds pratiques à la compilation — traitez toute croissance comme un signal de refactoring

## Problèmes de format

Les zips découpés (split), zip64, les entrées chiffrées et les compressions non prises en charge sont chacun rejetés avec un message dédié. Tous les fichiers doivent être de l'UTF-8 valide.

## Référence des ids d'erreur du chargeur

| Id | Signification |
|---|---|
| `loadZipTooBig` | zip de plus de 32 Mo |
| `loadTooManyZipEntries` | plus de 1 024 entrées |
| `loadTooManyWgsl` | plus de 256 `.wgsl` |
| `loadSourceTooBig` | plus de 256 Ko au total (contrôle par fichier en flux) |
| `loadManifestTooBig` | `pack.json` de plus de 64 Ko |
| `loadManifestNotJson` / `loadManifestNotObject` | pas du JSON / pas un objet |
| `loadNoApiVersion` / `loadWrongApiVersion` | manquante / pas `5` ([Erreurs de version d'API](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` manquant / `author` qui n'est pas une chaîne |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compression non prise en charge / zip64 / découpé / chiffré |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | chemin en double / non-UTF-8 / échec de décompression / zip endommagé |
| `loadNoManifest` / `loadDuplicateManifest` | position du manifeste / duplication |

## "Ready. Reload the page to use it." mais rien ne change

- **Cause** : les packs ont besoin d'un **rechargement de la page** pour s'activer
- **Correction** : rechargez après la sélection ; le statut doit devenir `Ready to use`
- **Note** : des surcharges de renderer oubliées (`?renderer=`, localStorage `bloxdRenderer`) font que les packs refusent de démarrer — nettoyez-les et rechargez

## Voir aussi

- [Erreurs de version d'API](api-version.md) · [Structure du pack](../getting-started/pack-structure.md) · [Format du pack](../api/pack-format.md)
