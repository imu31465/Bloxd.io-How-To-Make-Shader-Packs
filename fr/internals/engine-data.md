# Relevé des données du moteur

> API cible : 5 · Build cible : `bny9u` (2026-11-05 ; production et preprod servent le même bundle identique octet par octet) · État : Verified

Le relevé de mesures de la documentation — chaque valeur confirmée, toutes mesurées sur le build cible actuel `bny9u`.

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
| registre de textures | 1 210 entrées → **896 noms utilisables** ; dérive vs cnty9 +1/−10 ([Registre des textures](texture-registry.md)) → `xkg8x` (2026-11-04) : 1 220 / **906** → `bny9u` (2026-11-05) : 1 232 / **911 noms utilisables** — +5 (Terminal d'Échange ×3, Générateur de Pierre ×2), 864 changements d'id |
| courbe de lumière | niveaux 0–15 → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — dans l'en-tête, inchangée |
| courbe de lift | `1 - (1 - x / (3 - 2x))^3` — inchangée (actuellement chunk c9) |
| cône directionnel | `0.12 / 0.65 / 0.62 / 0.95` — inchangé (chunk c9) |
| couleur de brouillard | `vec3f(183/255, 191/255, 195/255)` — inchangée |
| noms réservés | `/^bloxd/i` (insensible à la casse) + les 46 symboles `bloxdSp*` du moteur ([Identifiants réservés](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| titres stricts | tout sauf les 12 titres allow de [Politique](policy.md) (réénumérés sur bny9u : 115 définitions de jeu, 28 entrées allow — les mêmes 12 titres) |
| constructeurs en-tête/registre | module d'en-tête 29815 dans le chunk c56 (renuméroté depuis c55) ; sur `bny9u` le constructeur du registre est le module 29812 (chunks c52/c53/c54, module de données 1351 ; sur `xkg8x` c'était 30093 + 1391) |
| gabarit de pack par défaut | chunk c122 (c116 sur `xkg8x`, c124 en v4), 1 633 o |

## Agencement du bundle (pour refaire le relevé)

Le cluster du pipeline de shaders : chargeur (zip/manifeste/limites, module 32942) et constructeur du registre c52–c54, validateur/en-tête c56, WebGPU/codegen c57, brouillard c9. **Le gabarit de pack par défaut est c122** (c116 sur `xkg8x`, c124 en v4).

Note sur le format des chunks : chaque chunk est un module ES (`export const modules = {...}`) — c53 transporte à la fois les modules de c52 et ceux de c53 — donc la recherche en texte brut dans le bundle reste pertinente (l'id de module `1371` vit dans le tableau de modules épars de *main*, dans aucun chunk).

Le bundle principal fait 3,39 Mo (+115 Ko vs le build v4) ; la carte des chunks compte 195 ids (188 émis, 7 lacunes connues).

## Anciens relevés

- v4 (cnty9, 2026-10-27) → [Historique des versions : v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Historique des versions : v3](../history/v3.md)

## Voir aussi

- [Journal de recherche](research-log.md) · [En-tête du moteur](engine-header.md) · [Politique](policy.md)
