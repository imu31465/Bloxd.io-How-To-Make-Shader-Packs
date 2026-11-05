# Intérieurs de l'invocation des hooks

> API cible : 5 · Build cible : `bny9u` · État : Analyzed (restauré depuis le bundle de production — le renderer Lite ; le fichier source intégré `lite/terrainShaderPack.ts` survit dans les messages d'erreur)

Comment le moteur appelle les hooks à l'exécution. Cela ne change rien au code que vous écrivez, mais supprime les conjectures sur ce que les hooks reçoivent.

## L'architecture de greffe

Le renderer n'« appelle » pas les hooks depuis JavaScript. Une fois qu'un pack passe la validation, le moteur **greffe vos invocations de hooks dans son WGSL de terrain en remplaçant des lignes d'ancrage fixes dans le texte du shader**. Chaque ancre doit correspondre exactement une fois — zéro ou plusieurs correspondances avortent avec `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Étape | Ancre dans le shader du moteur | Ce qui est greffé |
|---|---|---|
| vertex | le bloc allant de `let worldPos = …` à `vertexOutputs.vNormalW = …` | construire `BloxdVertexIn`, appeler le hook de vertex, réécrire `worldPos` (en réécrivant aussi `let worldPos` en `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construire `BloxdSurfaceIn`, appeler le hook de surface, réécrire `baseColor` / `alpha` |
| couleur éclairée | juste avant le mix de brouillard | capture la couleur pré-brouillard (la v3 utilisait la temporaire `bloxdSpLitColour` — la v5 promeut ce rôle en la fonction d'en-tête publique `bloxdLitColour()`) |
| light | le `return color;` en fin de fragment shader | construire `BloxdLightIn`, appeler le hook de light, réécrire `color` — après le mix de brouillard |

## Ce que la greffe impose

- **le terrain strict ignore les changements d'alpha des hooks de surface.** La réécriture `alpha = bloxdSpSurface.alpha` n'est greffée que pour le programme liquide ou les variantes non strictes — l'implémentation derrière la table de macros ([Préprocesseur](../api/preprocessor.md))
- **Une variante stricte qui déclare un hook de vertex ne l'exécute jamais.** Le moteur le signale au moment du build : `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. D'où le `#ifndef BLOXD_STRICT` du gabarit
- **Les identifiants `bloxdSp*`** sont des temporaires du moteur — invisibles pour votre code mais présents dans les diagnostics et la sortie de rétro-ingénierie ([Identifiants réservés](reserved-identifiers.md) — 46 en v5)
- **Le raccourci de surface par défaut.** Si le hook de surface d'une variante est littéralement `bloxdDefaultSurface`, le moteur omet entièrement la greffe de réécriture `baseColor` / `alpha` — le défaut produit déjà ces valeurs, donc les affectations sont du code mort. **Les chaînes de hooks non modifiées ne coûtent rien**

## Ce qui a changé en v5

L'architecture de greffe existait dans le renderer v2 et est restée stable de v2 → v3 (la v3 n'a changé que `vBlockId` → `vBlockFlags` et ajouté la variante liquide). Les changements de la v5 :

- `vBlockFlags` (bits) → la **struct `BloxdFlags`** (délivrée via `bloxdSpFlags`)
- la capture de `litColour` est passée d'interne au moteur à **API publique** (`bloxdLitColour()` — le `bloxdSpLitColour` de la v4 promu)
- `BloxdLightIn` a gagné `diffuse` / `emissive`, et `bloxdShading()` reconstruit la réponse matériau ([Éclairage](../api/lighting.md))
- livraison de `localPosition` (`bloxdSpItemLocalPosition`), des entrées d'enchant (`bloxdSpEnchant`) et d'`overlayColour` ([Rendu des modèles](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (inversé)
- le programme Model a rejoint la matrice de variantes (3 programmes × 2 modes = 6 variantes)

## Ce qui alimente BloxdLightIn (par champ)

| Champ | Source côté moteur |
|---|---|
| `litColour` | la couleur de fragment capturée juste avant le mix de brouillard — « avant émission et brouillard » en termes d'en-tête |
| `directional` | la somme des Lambert par lumière directionnelle, interpolée par vertex (setup à 2 lumières dans [Pipeline de rendu](rendering-pipeline.md)) |
| `diffuse` / `emissive` | la réponse RVB directionnelle du matériau / la lueur RVB |
| `ambient` | `material.ambient × sceneAmbient` — par matériau, par frame |
| `blockLight` / `skyLight` | les varyings de niveaux de lumière décodés ([Intérieurs de l'éclairage](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | les uniforms correspondants |
| `heldLight` | construit depuis le varying de niveau de lumière et les uniforms de lumière tenue (atténuation de cône dans [Intérieurs de l'éclairage](lighting-internals.md)) |
| `fogColour` | noir uniquement dans les scènes entièrement sans brouillard (mode 0) |
| `fogAlpha` | le facteur de brouillard clampé ([Intérieurs du brouillard](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varyings et valeurs à interpolation flat (comme `BloxdSurfaceIn` — valeurs post-hook de vertex) |

## Voir aussi

- [Hooks de shader](../api/hooks.md) · [Pipeline de rendu](rendering-pipeline.md) · [Identifiants réservés](reserved-identifiers.md) · [Historique des versions : v3](../history/v3.md)
