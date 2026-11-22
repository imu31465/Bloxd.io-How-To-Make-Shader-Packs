# Structure du pack

> API cible : 5 · Build cible : `bbb6l5` · État : Verified

## Format de distribution

- **Format** : un unique `.zip`, ou un dossier (le chargement par dossier n'existe que sur navigateurs de bureau)
- **Contenu** : un `pack.json` (au niveau supérieur du pack ; insensible à la casse) + 1–256 fichiers `.wgsl`
- Les fichiers `.wgsl` sont concaténés en un seul module : vous pouvez donc répartir le code entre plusieurs fichiers et sous-dossiers. Les noms de fichiers ne sont soumis à aucune restriction. La concaténation suit l’**ordre lexicographique des chemins** (les déclarations au niveau du module ne dépendent pas de l’ordre ; cela ne compte que pour le code qui dépend de l’ordre d’initialisation des `var`). Les fichiers autres que `.wgsl` (comme les README) sont ignorés.

## Limites de taille et de format

| Élément | Limite | Message en cas de dépassement |
|---|---|---|
| taille du zip | 32 Mo | `The zip is over 32 MB.` |
| entrées du zip | 1 024 | `The zip has more than 1024 entries.` |
| taille de `pack.json` | 64 Ko (UTF-8) | `pack.json is over 64 KB.` |
| nombre de fichiers `.wgsl` | 256 | `The pack has more than 256 .wgsl files.` |
| source `.wgsl` totale | 256 Ko (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| forme du zip | sans zip64 / split / chiffré ; store ou deflate ; sans chemins en double | chacun rejeté avec son propre message |

Tous les fichiers doivent être de l'UTF-8 valide.

## Conseils de compression

Un zip qui range tout sous un même dossier racine commun voit ce préfixe retiré automatiquement (la fonction « Compresser » de macOS fonctionne telle quelle ; `__MACOSX`, les fichiers préfixés `._` et `.DS_Store` sont exclus automatiquement). Des fichiers parasites au niveau racine cassent la détection du niveau supérieur ; la méthode la plus sûre est donc de zipper `pack.json` et les fichiers `.wgsl` directement (vérifiez que `pack.json` se retrouve bien à la racine du zip).
