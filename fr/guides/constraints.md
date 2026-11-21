# Ce que les packs de shaders peuvent et ne peuvent pas faire

> API cible : 5 · Build cible : `bbb6l5` (2026-11-20, production et preprod) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)

Le plafond de réalisme des packs de shaders en une page : jusqu'où va l'API actuelle, ce qu'elle ne peut fondamentalement pas faire, ce qui est conditionnel, pourquoi ces limites existent et quels sont les substituts les plus proches. Évaluez ici un look avant de le construire.

## Ce que l'API actuelle peut faire

- **Couleurs, transparence et émission, par face** — les trois hooks `Surface` renvoient la couleur (plus alpha et émission conditionnels) pour le terrain, les liquides et les modèles
- **Un rééclairage complet** — les trois hooks `Light` et l'API d'éclairage (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) exposent la recette même du moteur comme fonctions composables ([Éclairage](../api/lighting.md))
- **Ombres qui suivent le soleil et la lune** — `bloxdShadow()` renvoie le facteur d’ombre calculé par le moteur ; `bloxdAirShadow(t)` permet d’échantillonner l’ombre entre la caméra et le fragment, et `bloxdShadowDirection()` renvoie la direction de la lumière ([Ombres](shadows.md))
- **Lire les textures du jeu lui-même** — `bloxdTexel()` échantillonne l'atlas de textures de blocs et les textures propres aux modèles exactement comme le sampler du moteur ([API de textures](../api/texture-api.md))
- **Des effets par modèle** — `flags` vous dit « ceci est un objet tenu », « ceci est un objet lâché », « ceci est un joueur », « ceci est un demi-bloc » ([Flags](../api/flags.md)) ; `localPosition` fournit les coordonnées locales au modèle ([Structures](../api/structures.md))
- **Éclats d'enchantement et superpositions de flash de dégâts** — `enchantTier` / `enchantColour` / `enchantSpeed` et `overlayColour` sont lisibles et surchargeables ([Effets d'enchantement](../recipes/enchant-effects.md))
- **Temps et animation** — `bloxdSeconds()`, la position monde et la direction du soleil mettent tout en mouvement ([Temps et animation](../recipes/animation.md))

## Ce que l'API actuelle ne peut pas faire

| Look | Motif |
|---|---|
| Cartes d'ombres précises au pixel (ombres suivant le soleil, pénombre) | Les textures de profondeur ne peuvent pas être référencées (`bloxdOpaqueBehind()`, en liquides seuls, n'est que géométrique et inutilisable comme carte d'ombres). L'occlusion des rayons lumineux n'est pas fournie aux hooks |
| SSAO | Pas d'accès à la profondeur de scène (seule l'AO de sommets cuite par le mesher ; la profondeur en liquides seuls est inutilisable pour le SSAO) |
| SSR (reflets) | Pas de couleur de scène. Seuls des looks pseudo mélangeant la couleur du ciel via fresnel |
| Bloom / glare | Pas de hook vers le post-traitement |
| Profondeur de champ, aberration chromatique, grain | Post-traitement plein écran requis |
| Lumière volumétrique (god rays) | Idem |
| Cartes PBR personnalisées (textures de normal / roughness / metalness) | Les packs ne peuvent pas ajouter de textures propres — l'API ne fait que *lire* les textures existantes du jeu via `bloxdTexel()`, et ce sont des textures de couleur simple sans canaux PBR. Une réponse pseudo-PBR ne peut être qu'estimée depuis la luminance de couleur plus `flags` ([API de textures](../api/texture-api.md)) |
| Réfraction sous-marine | Pas de couleur de scène. La profondeur en liquides seuls (`bloxdOpaqueBehind()`) permet l'absorption par épaisseur et la projection du fond ([Rendre l'eau d'aspect naturel](water.md)) |
| Retirer / changer le voile sous-marin (teinte bleue) | Le voile est un quad emissive plein écran généré depuis la couleur/l'alpha de définition du bloc liquide où se trouve la caméra, dessiné hors des pipelines de hooks (tout devant), donc les packs ne peuvent en changer ni la couleur ni la densité |
| Détection sous-marine directe | Aucune entrée n'indique la submersion de la caméra, et fogStart / fogEnd / fogColour ne changent pas sous l'eau, donc il n'existe aucun moyen fiable d'estimer l'état sous-marin depuis fogAlpha etc. |
| Changer le ciel, les nuages ou le disque solaire lui-même | Les hooks s'exécutent par face sur la géométrie terrain / liquide / modèle ; le skybox ne fait partie d'aucun pipeline de hooks |

## Capacités conditionnelles

- **Animation de sommets et `discard`** — uniquement dans les jeux dont la définition porte `shaderPackPolicy: "allow"` ; partout ailleurs `BLOXD_STRICT` compile ces hooks hors ([Politique de shader packs par jeu](../internals/policy.md))
- **Profondeur de scène (`bloxdOpaqueBehind()`)** — hooks de liquides seuls, et il lui faut `BLOXD_SCENE_DEPTH` ; les hooks de terrain et de modèle n'ont pas d'accès à la profondeur ([Fonctions](../api/functions.md))
- **`bloxdTexel()` / `bloxdTextureSize()`** — hooks de surface et de light uniquement, et seulement là où le pipeline a une texture ; les configurations sans texture les compilent en stubs qui renvoient du blanc ([API de textures](../api/texture-api.md))
- **Alpha de terrain (`BLOXD_ALPHA`)** — uniquement là où la variante le définit ([Variantes et gardes](../getting-started/variants.md))

## Pourquoi ces limites existent

Quatre entrées qu'un shader de post-traitement « réel » nécessiterait sont structurellement absentes :

1. **Pas de couleur de scène** — les hooks s'exécutent pendant que chaque face est dessinée ; il n'y a pas de texture de framebuffer à lire, donc SSR, réfraction et tout ce qui dérive de « ce qui est derrière moi » ne peuvent pas être calculés
2. **Pas de profondeur de scène** — sauf la sonde géométrique `bloxdOpaqueBehind()` en liquides seuls ; SSAO et cartes d'ombres exigent un tampon de profondeur complet
3. **Pas d'étage de post-traitement** — aucun hook ne s'exécute après la composition de l'image, donc bloom, DOF, aberration, grain et god rays n'ont aucun point d'entrée
4. **Pas d'accès au ciel** — le skybox, les nuages et le disque solaire sont dessinés hors des pipelines de hooks, et aucune entrée ne les décrit au-delà de `bloxdSunDirection()`

Le voile sous-marin est un cas particulier de la même structure : c'est un quad emissive plein écran dessiné tout devant, généré depuis la définition du bloc liquide dans lequel se trouve la caméra — hors de tout pipeline de hooks.

## Substituts les plus proches

| Recherché | Approche la plus proche côté pack |
|---|---|
| Reflets | Mélange pondéré par fresnel vers une couleur de type ciel + éclat solaire ([Rendre l'eau d'aspect naturel](water.md)) |
| Matériaux PBR | Estimation de specular/roughness par luminance + classes de matériaux par `flags` ([Couleurs](../recipes/colors.md), [Réalisme](../recipes/realism.md)) |
| Bloom / glow | Sortie d'emission — une lueur réellement additive, mais par face, pas un flou de post-traitement ([Émission](../recipes/emission.md)) |
| Occlusion ambiante | L'AO de sommets cuite par le mesher déjà présente dans `surface.colour` ; l'assombrissement par skyLight sert en plus d'AO à grande échelle ([Ombres](shadows.md)) |
| Absorption de profondeur de l'eau | Épaisseur via `bloxdOpaqueBehind()` + projection du fond dans les hooks de liquides ([Liquides](../recipes/liquids.md)) |
| Ambiance sous-marine | Acceptez le voile ; stylisez ce qui est visible à travers lui (terrain/liquides continuent de s'afficher normalement sous l'eau) |

## La méthode `skyLight` comme solution de repli
La technique `skyLight` présentée ci-dessus permet d’assombrir les zones sous les arbres et les toits, mais elle se base sur la visibilité du ciel vers le haut et ne suit pas le soleil. Pour des ombres qui suivent le soleil ou la lune, utilisez `bloxdShadow()`.
## Réalité sous-marine

Les looks sous-marins se composent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light sont appelés normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran généré depuis la couleur/l'alpha de définition du bloc liquide à la position de la caméra, dessiné tout devant. Le réglage de jeu `cameraTint` l'emporte s'il est défini | Non (ni couleur ni densité modifiables) |
| ③ cameraTint | Réglage de jeu | Non |

Points pratiques : les packs continuent de fonctionner sous l'eau / le voile ne peut pas être retiré / on ne peut pas brancher sur l'état sous-marin (fogStart / fogEnd / fogColour ne changent pas sous l'eau, donc fogAlpha ne peut pas non plus le détecter).

## Voir aussi

- [Ombres](shadows.md) — la technique d'ombres par skyLight en entier
- [Modèles et textures](models.md) — ce que touche le pipeline de modèles
- [Compatibilité](../api/compatibility.md) — comment se comportent les packs d'anciennes versions
- Les changements de ces limites version par version : [Historique des versions](../history/)
