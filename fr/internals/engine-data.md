# Relevé des données du moteur

> API cible : 5 · Build cible : `xkg8x` (2026-11-04 ; production ; preprod identique sur toutes les surfaces de shader pack) · État : Verified

Le relevé de mesures de la documentation — chaque valeur confirmée, toutes mesurées sur le build cible actuel `xkg8x`.

## Le relevé

| Élément | Valeur |
|---|---|
| `apiVersion` | `5` (strict `===`, nombre) |
| en-tête du moteur | 8 954 o décodés / 208 lignes (9 125 o en l'état livré, 6 interpolations). Première ligne `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — texte intégral dans [En-tête du moteur](engine-header.md) |
| hooks | 9 (terrain/liquide/modèle × vertex/surface/light). Noms inchangés ; le gabarit par défaut embarque les 9 |
| variantes | 6 (strict × programme). Noms `strict\|allow.terrain\|liquid\|model` — l'axe d'éclairage a disparu |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (tout liquide + terrain/modèle non stricts) · `BLOXD_SCENE_DEPTH` (tout liquide) · ~~`BLOXD_LIGHTING`~~ **retirée** |
| uniform du pack | `@group(3) @binding(0)`, 64 o : seconds@0, **lit@4 (u32, nouveau)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| bindings du pack | groupe 3 : 0 uniform · 1 profondeur de scène (liquide) · 2 storage `bloxdSpTextureLayers` |
| flags | la struct `BloxdFlags`, 14 booléens ; les valeurs de bits de la v4 retirées |
| limites du chargeur | 256 `.wgsl` / 256 Ko de source / 64 Ko `pack.json` / 32 Mo de zip / 1 024 entrées ; UTF-8 ; un seul manifeste ; chemins uniques — tout inchangé |
| registre de textures | 1 210 entrées → **896 noms utilisables** ; dérive vs cnty9 +1/−10 ([Registre des textures](texture-registry.md)) → `xkg8x` (2026-11-04) : 1 220 / **906 noms utilisables** — les 10 retraits inversés, 376 changements d'id |
| courbe de lumière | niveaux 0–15 → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — dans l'en-tête, inchangée |
| courbe de lift | `1 - (1 - x / (3 - 2x))^3` — inchangée (actuellement chunk c9) |
| cône directionnel | `0.12 / 0.65 / 0.62 / 0.95` — inchangé (chunk c9) |
| couleur de brouillard | `vec3f(183/255, 191/255, 195/255)` — inchangée |
| noms réservés | `/^bloxd/i` (insensible à la casse) + les 46 symboles `bloxdSp*` du moteur ([Identifiants réservés](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| titres stricts | tout sauf les 12 titres allow de [Politique](policy.md) (revérifiés sur xkg8x, inchangés) |
| constructeurs en-tête/registre | chunk c55 (module 29833 + 1371 + 1391 + 1384 + 219 en coordination) ; sur `xkg8x` le constructeur est le module 30093 (module de données 1391) |
| gabarit de pack par défaut | chunk c116 (déplacé depuis le c124 de la v4), 1 683 o |

## Agencement du bundle (pour refaire le relevé)

Le cluster du pipeline de shaders : chargeur/persistance c51–c53, validateur/constructeur d'en-tête/registre c55, WebGPU/codegen c56, brouillard c9. **Le gabarit de pack par défaut est c116** (c124 en v4).

Note sur le format des chunks : chaque chunk est un module ES (`export const modules = {...}`) — c53 transporte à la fois les modules de c52 et ceux de c53 — donc la recherche en texte brut dans le bundle reste pertinente (l'id de module `1371` vit dans le tableau de modules épars de *main*, dans aucun chunk).

Le bundle principal fait 3,39 Mo (+115 Ko vs le build v4) ; la carte des chunks compte 195 ids (188 émis, 7 lacunes connues).

## Anciens relevés

- v4 (cnty9, 2026-10-27) → [Historique des versions : v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Historique des versions : v3](../history/v3.md)

## Voir aussi

- [Journal de recherche](research-log.md) · [En-tête du moteur](engine-header.md) · [Politique](policy.md)
