# pack.json (manifeste)

> API cible : 5 · Build cible : `ab90qa` (vérifié en production le 2026-11-03) · État : Verified

`pack.json` est le manifeste du pack — exactement un objet JSON à la racine du zip.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## Champs

| Champ | Type | Requis | Description |
|---|---|---|---|
| `apiVersion` | nombre | requis | Doit être **exactement égal à `5`** (`===` strict). Une chaîne `"5"` ou tout autre type échoue, signalé avec l'orthographe JSON |
| `name` | chaîne | requis | Non vide après suppression des espaces en début et fin. Affiché dans l'interface des réglages |
| `author` | chaîne | optionnel | Peut être omis ; doit être une chaîne s'il est présent |

Tous les autres champs sont ignorés par le chargeur.

## Ce qui se passe en cas d'incompatibilité de version

Le chargeur compare `manifest.apiVersion !== 5` strictement et **échoue à l'instant du chargement**. Messages, mot à mot du dictionnaire i18n en production :

- `pack.json needs "apiVersion": {{version}}.` — la clé est entièrement absente
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la clé existe mais n'est pas 5

Les anciens packs déjà enregistrés ne lèvent pas d'exception ; ils se résolvent en `{kind: "none", reason: "otherApiVersion"}` et deviennent **silencieusement inactifs**. L'onglet des réglages des packs de shaders explique pourquoi :

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

Pour une migration depuis v1–v4, voir l'[Historique des versions](../history/).
