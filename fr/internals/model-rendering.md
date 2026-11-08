# Intérieurs du rendu des modèles

> API cible : 5 · Build cible : `v98qt8` · État : Analyzed (restauré depuis le bundle en production)

Les intérieurs du programme Model v5. Le guide côté utilisateur : [Modèles et textures](../guides/models.md).

## Ce qu'est le programme Model

Avant la v5, les packs ne pouvaient se brancher que sur terrain / liquide ; les modèles de blocs (dalles, escaliers, plantes) et les entités (joueurs, mobs, objets) étaient **hors de la juridiction des packs**. La v5 a ajouté model comme troisième programme, dessinant :

- les blocs dessinés comme modèles de blocs (note d'en-tête : *« Drawn as block models, so never part of terrain or flagged as opaque »*)
- les objets tenus / lâchés / lancés
- les joueurs, mobs, PNJ (armures et cosmétiques inclus)

## Livraison des flags et des entrées

- **`bloxdSpFlags`** — le chemin de livraison de la struct `BloxdFlags` ; les 8 nouveaux champs (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) ne portent des valeurs signifiantes que sur les faces de modèle
- **`bloxdSpItemLocalPosition`** — livraison de `localPosition` ; `vec3f(0.0)` sur terrain/liquide
- **`bloxdSpEnchant`** — livraison des entrées d'enchant (`enchantTier` / `enchantColour` / `enchantSpeed`)

## Calcul de l'enchant

Le moteur anime le balayage du scintillement et le livre en tant que `enchantColour.a` aux hooks surface/light ([Effets d'enchantement](../recipes/enchant-effects.md)). Le mélange se produit à l'intérieur de `bloxdLitColour()` — juste après l'ombrage, avant la lumière du monde ([Éclairage](../api/lighting.md#le-pipeline-complet)).

## L'overlay (flash de dégâts etc.)

`overlayColour` porte la couleur d'état d'entité (flash de dégâts etc.) en RVB + alpha. `bloxdLitColour` la mélange **avant l'éclairage**, si bien que l'expression d'état passe sans casser la couleur de base. Le traitement existait en interne en v4 et a été ouvert aux entrées/sorties en v5.

## Le chemin des textures

La plupart des faces de modèle utilisent `textureId: 0` (pas de texture) — les skins de joueurs et les textures de mobs ne sont pas dans l'espace de noms de l'atlas de textures de blocs. `surface.colour` arrive avec skin × teinte cuits dedans, donc le traitement des faces de modèle part de `colour` ([textures possédées par le modèle](../api/texture-api.md#textures-possédées-par-le-modèle-textureid-0)).

## Variantes

Le programme Model forme un axe de la matrice de variantes : `strict.model` / `allow.model`. `BLOXD_ALPHA` n'est défini que dans allow.model ([Préprocesseur](../api/preprocessor.md#matrice-macros--variantes)) ; strict.model n'a pas de hooks de vertex.

## Voir aussi

- [Modèles et textures](../guides/models.md) · [Recettes de shaders pour modèles](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Pipeline de rendu](rendering-pipeline.md)
