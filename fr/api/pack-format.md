# Format du pack

> API cible : 5 · Type : référence de l'API

Cette page résume le manifeste, les limites de l'archive ZIP et l'uniform du pack. Pour les étapes de configuration, consultez [Premiers pas](../getting-started/manifest.md).

## pack.json

Placez `pack.json` à la racine de l'archive ZIP. Il doit s'agir d'un objet JSON.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `apiVersion` | number | Oui | Définissez la valeur numérique `5`. Une chaîne n'est pas acceptée |
| `name` | string | Oui | Nom non vide après suppression des espaces extérieurs |
| `author` | string | Non | Nom de l'auteur |
| `keepCircleShadows` | boolean | Non | Définissez `true` pour conserver les ombres circulaires traditionnelles tout en utilisant l'API d'ombre |

## Limites du chargeur

| Élément | Limite |
|---|---:|
| Fichiers `.wgsl` par pack | 256 |
| Sources `.wgsl` au total | 256 KB |
| `pack.json` | 64 KB |
| Archive ZIP | 32 MB |
| Entrées ZIP | 1 024 |

Les archives ZIP fractionnées, Zip64, les entrées chiffrées et les méthodes de compression non prises en charge sont refusés. Enregistrez tous les fichiers en UTF-8 et n'incluez pas de chemins en double dans l'archive.

## Uniform du pack

L'uniform du pack occupe 80 octets et est lié à `@group(3) @binding(0)`.

| Décalage | Champ | Type |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

La taille minimale de liaison de l'uniform est de 80 octets. Les autres liaisons du groupe 3 sont la texture de profondeur de scène pour les variantes Liquid et le tampon de stockage `bloxdSpTextureLayers`.

## Voir aussi

- [Créer le manifeste](../getting-started/manifest.md)
- [Référence de l'API](./)
- [Guide de migration vers l'API v5](../history/v5.md)
