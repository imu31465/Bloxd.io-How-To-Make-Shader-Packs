[← Partie précédente](09-apiv3.md)·[Retour au manuel](README.md)

# Partie X : Guide de migration vers API Version 4 (2026-10-26, résumé)

> Ce texte est le résumé court dans cette langue. La version complète, avec tous les détails, recettes d’exemple et internals du moteur restaurés (§55–§66), est disponible en [anglais](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) et en [japonais](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Build visé : `cnty9.main.669f8081.js` — **en production et en préprod simultanément depuis le 2026-10-26** (les deux identiques octet pour octet). Le modèle de pack garde sa forme : mêmes champs `pack.json`, mêmes limites du chargeur, même uniform de 64 o, mêmes 6 hooks.

## Ce qui change

- `pack.json` exige `"apiVersion": 4` (égalité `===` stricte, nombre) — les packs v3 sont refusés au chargement.
- **Nouvelle API de textures (la vedette) :** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` échantillonne l’atlas de textures de blocs exactement comme le moteur lui-même (id 0 = blanc ; les textures animées renvoient automatiquement l’image courante), `bloxdTextureSize(mipLevel) -> vec2u`, et des constantes nommées `bloxdTextureId*` (CamelCase à partir du nom de fichier, p. ex. `grass_top` → `bloxdTextureIdGrassTop` ; le catalogue officiel est `BLOCK_TEXTURES.md`).
- **Quatre nouveaux champs d’entrée** dans `BloxdSurfaceIn` *et* `BloxdLightIn` : `textureId`, `textureRotation` (quarts de tour horaires, appliqués par `bloxdTexel`), `uv` (en blocs ; `fract(uv)` est dessiné), `mipLevel`.
- **Renommages avec changement de sens :** `fogVisibility` → `fogAlpha` au sens **inversé** (`0 = pas de brouillard, 1 = seulement fogColour` ; portage : `l.fogVisibility` → `1.0 - l.fogAlpha`) ; `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (corps identique) ; `BloxdOpaqueBehind.found` → `hit`.
- **Les jeux stricts sont désormais imposés par le validateur embarqué :** un hook de sommet non protégé ou un `discard` atteignable produit `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` et désactive **tous** les hooks dans les jeux stricts. Avec les gardes `#ifndef BLOXD_STRICT`, surface/light continuent de fonctionner.
- Tout le reste est figé : 6 hooks, bits de `blockFlags` (1/2/4/8/16/32), disposition de l’uniform, limites du chargeur, matrice des variantes, les 12 titres allow (reconfirmés inchangés sur `cnty9` le 2026-10-27).

## Migration express

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (nombre) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` ou `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Hooks de sommet non protégés | `#ifndef BLOXD_STRICT ... #endif` |

Des références officielles existent désormais (`bloxd-api.wgsl` et `BLOCK_TEXTURES.md`, Discord officiel). Les détails complets — subtilité de rotation de `bloxdTexel`, WGSL d’échantillonnage restauré, registre des noms avec ≈900 constantes utilisables, nouvelle structure de `HEADER_VERSION` avec hash du registre — sont dans la version complète en anglais et en japonais.

[← Partie précédente](09-apiv3.md)·[Retour au manuel](README.md)
