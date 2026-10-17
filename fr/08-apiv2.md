[← Partie précédente](07-internals.md)·[Retour au manuel](README.md)

# Partie VIII : Guide de migration vers API Version 2

Build visé : `6qxffk.main.5912a15f.js` (déploiement de production au 2026-10-16). Les parties I à VII de ce guide sont déjà réécrites au standard v2 ; cette partie VIII résume les points de migration depuis la v1 et les nouveautés v2. Les exemples de code des nouveautés ont passé la validation 8/8 variantes du compilateur v2 et la validation du compilateur WGSL du navigateur (Tint) (§38), et la conversion v2 des recettes existantes n'est qu'un remplacement mécanique d'identifiants : vérifiez toujours par compilation en jeu avant de distribuer.

## 31. Le sort des packs v1 (d'abord la conclusion)

Le jeu exige que l'`apiVersion` du manifest corresponde **strictement à 2**. Charger un pack v1 est refusé avec `This pack is for shader pack API version 1. Bloxd supports version 2.` (clé i18n `shaderPack:loadWrongApiVersion`). Il n'existe **aucun support parallèle v1/v2**. Par ailleurs, le moteur réinspecte le `validation.headerVersion` des packs sauvegardés (hash de l'en-tête entier) : le mécanisme rendant les packs sauvegardés automatiquement « à revérifier » lors des mises à jour moteur est le même qu'en v1.

## 32. Renommage complet des identifiants (table de correspondance)

En v2, la nomenclature underscore est unifiée en camelCase. **Les anciens noms sont totalement inutilisables**.

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (uniform interne) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64 o) |

Les sortes de hooks (vertex / surface / light × terrain / liquide, 6 au total) et le format de `pack.json` (`apiVersion` / `name` / `author`) ne changent pas. Les limites du chargeur non plus (zip 32 Mo / 1024 entrées / 256 fichiers `.wgsl` / 256 Ko au total / manifest 64 Ko).

## 33. Où portent les champs supprimés

En v1, `time` / `eyePosition` / `sunDirection` / `originOffset` étaient des champs de structs. En v2, **ces champs sont supprimés et remplacés par des fonctions d'en-tête** lisant l'uniform moteur (`bloxdPackInputs`). Comme les fonctions lisent l'uniform directement, elles s'appellent **même depuis les fonctions de portée module hors hooks et depuis les hooks vertex**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| Mise en coordonnées monde par `s.position + vec3f(...)` | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Nouveauté ① : `blockId` (shading par bloc)

Les 3 structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` gagnent toutes `blockId: u32`. C'est l'**ID du bloc possédant la face** (0 à 65535), constant sur toute une face (passé en `@interpolate(flat)`). Il sert à identifier les types de blocs sans dépendre de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur et invisible des packs : **on mesure en monde quel ID vaut quel bloc, ou l'on consulte la référence ci-dessous**.

**Référence** : l'auteur publie une liste des entrées du jeu sur [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json` : table id ↔ nom de bloc ; les variantes de rotation/meta comme `Furnace|meta|rot2` y figurent comme IDs séparés). Ces correspondances peuvent changer à chaque mise à jour du jeu — validez en jeu réel ce qui doit être définitif.

### R-F. Teinte par type de bloc avec blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // ex. : teinte froide pour la famille pierre (motif de bits hauts de l'id)
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. Nouveauté ② : `BLOXD_SCENE_DEPTH` et `bloxdOpaqueBehind()` (la principale)

L'accès à la profondeur, structurellement impossible en v1, est débloqué **pour les seuls programmes liquides (liquid)**. Pas de couleur, mais **l'info géométrique de distance et position de la face opaque derrière**. L'usage typique : calculer une couleur d'absorption depuis l'épaisseur d'eau mesurée.

Règles d'usage :

| Usage | Résultat |
|---|---|
| Appel sans garde dans `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (toujours défini en variantes liquides) |
| Appel sans garde dans `bloxdTerrainSurface` | ERREUR. Entourer avec `#ifdef BLOXD_SCENE_DEPTH` |
| Appel dans un hook vertex | ERREUR (hooks surface / light seuls) |

Pour user de la profondeur en hooks terrain aussi, entourez avec `#ifdef BLOXD_SCENE_DEPTH` (les hooks terrain étant réutilisés par les programmes liquides, la profondeur n'y est valide que côté liquide).

### R-E. Absorption par épaisseur d'eau (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // longueur de la colonne d'eau = de la position actuelle à la face opaque derrière
        let thickness = distance(behind.position, surface.position);
        // absorption Beer-Lambert : le rouge chute vite, le bleu porte loin
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // derrière = ciel : tirer vers un bleu profond
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Applications : absorption/diffusion par épaisseur, projection de motifs façon rides/caustiques depuis les coordonnées monde du fond via `behind.position`, reflet du ciel en surface distinguant ciel et occlusion avec `found=false`, gradation d'écume et de trouble par profondeur. Si la construction du pipeline de copie de profondeur échoue, dégradation sûre vers « rien derrière ».

## 36. Autres changements v2

- **Repli des hooks** : sans `bloxdLiquidXxx` défini, les programmes liquides replient sur le hook terrain. **Un pack à hooks terrain seuls agit tel quel sur l'eau aussi**. Si indésiré, définissez explicitement les hooks côté liquide.
- **Gardes de champs `BLOXD_LIGHTING` devenues inutiles** : `blockLight` etc. existent dans toutes les variantes, avec des défauts en unlit (0 / 1 / blanc / 0). N'utilisez `#ifdef BLOXD_LIGHTING` que pour tester la lumière. Garder les gardes existantes ne change rien.
- **Condition de définition de `BLOXD_ALPHA` changée** : défini en variantes terrain non strict et toutes variantes liquides, pas en strict × terrain. Gardez la garde pour écrire alpha en hooks terrain.
- **Construction directe de structs interdite** : les appels constructeurs comme `BloxdLight(...)` sont rejetés par la validation statique. Partez toujours de `bloxdDefault*` ou copiez l'entrée.
- **`let _ =` devient `_ =`** : l'affectation de rejet WGSL `_ = f();` est valide mais `let _ = f();` est rejeté.
- **offInStrict** : définir un hook vertex, ou un `discard` atteignable depuis des hooks surface / light, ne fait pas erreur mais auto-désactive tout le pack en jeux stricts (l'UI de réglages affiche `shaderPack:offInStrict`, et ça marche en jeux allow). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT`.
- **Brouillard étendu** : trois modes LINEAR / EXP / EXP2 sont implémentés côté calcul, mais le réglage jeu restant toujours LINEAR comme avant, la spec de brouillard existante s'utilise telle quelle. Le sens de `fogColour` est aussi officialisé par écrit (noir seulement en scènes totalement sans brouillard).
- **Inchangés** : courbe de lift, plancher 35 %, atténuation heldLight (`pow(lightDist, 0.75)`) et boost d'ambiant, spec de directions soleil/lune, couleur de brouillard par défaut, wrap de temps (3600 s), lumières directionnelles (4 max), Lite (WebGPU) seul, mécanisme de sauvegarde (IndexedDB), mot réservé `mod`.

## 37. Liste de migration v1 → v2

1. **pack.json** : `"apiVersion": 1` → `"apiVersion": 2`
2. **Identifiants** : tout remplacer via la table §32 (noms de hooks, noms de structs, fonctions default)
3. **Porter les champs supprimés** : vers les fonctions d'en-tête via la table §33 (`s.time` → `bloxdTime()` etc.)
4. Renommer **`fogFactor` → `fogVisibility`**
5. **Retirer les constructions directes de structs**
6. Corriger **`let _ =` en `_ =`**
7. **Entourer hooks vertex et discard avec `#ifndef BLOXD_STRICT`**
8. Vérifier que **l'eau subit aussi les hooks terrain** ; sinon définir explicitement les hooks liquid
9. (Optionnel) Gérer le brouillard depuis `litColour` / ajouter l'absorption par épaisseur avec `bloxdOpaqueBehind()` / expressions par bloc avec `blockId`
10. **Validez aussi la 2ᵉ étape (Tint du navigateur)** — en particulier les parenthèses des expressions contenant `^` `&` `|` `<<` `>>`. Du code passant la validation statique peut être refusé par le navigateur (§38)

## 38. Deuxième étape de validation — le compilateur WGSL du navigateur est plus strict que le parseur intégré

La validation des packs de jeu se fait en **2 étapes**. La 1ʳᵉ étape est la validation statique (parseur JS intégré au moteur — signatures de hooks, syntaxes interdites, règles propres aux packs comme l'usage de sceneDepth), et la 2ᵉ étape est la validation navigateur (les stubs joints au résultat de compilation sont compilés avec la vraie implémentation WebGPU, et les erreurs sont affichées remappées vers les lignes des fichiers d'origine du pack. Le « Saved, but it won't run until you fix these errors » de l'interface, c'est cette étape). Le suffixe comme `(only in terrain)` en fin d'affichage d'erreur désigne « l'espèce de program de la variante où l'erreur est apparue ».

Le parseur intégré n'implémente pas les règles de liaison (Binding) des opérateurs WGSL, et **du code passant la validation statique peut être refusé par le navigateur**. Le motif classique qui en pâtit souvent, c'est le hachage d'entiers :

| Opérateur | Conséquence |
|---|---|
| `<<` `>>` | Ne se combinent directement qu'au niveau unaire. `a + b << c` est une erreur |
| `&` `^` `\|` | Ne se combinent directement qu'au niveau unaire. `a * b ^ c` est une erreur |
| `&&` `\|\|` | Mélange interdit. `a && b \|\| c` est une erreur |

### Parenthésage (NG / OK)

```wgsl
// NG — passe la validation statique mais est refusé par le navigateur (Tint) :
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — parenthéser chaque multiplication (une chaîne du même opérateur A ^ B ^ C est légale par associativité à gauche)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Aucun code publié dans ce guide ne contient ce motif (les mélanges `+`/`*` de `pack_hash3` et `h ^ (h >> 16u)` sont déjà parenthésés, donc conformes). Après avoir écrit un pack, faites passer les 1ʳᵉ et 2ᵉ étapes toutes les deux.

## 39. Sur des matériaux indépendamment similaires

Il existe un matériau communautaire au contenu presque pareil : [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Publié avant ce guide, mais **le contenu de ce guide vient de l'analyse propre de glm sur les vrais fichiers bundle de Bloxd (jeu de chunks webpack) — pas du copier-coller**. Les deux coïncident parce qu'enquêter indépendamment sur la même implémentation mène aux mêmes conclusions.

---

Recherché par ltf_ahel (recherché avec glm)
