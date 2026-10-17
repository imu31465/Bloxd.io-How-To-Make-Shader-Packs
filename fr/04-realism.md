[← Partie précédente](03-recipes.md)·[Retour au manuel](README.md)·[Partie suivante →](05-troubleshooting.md)

# Partie IV : Guide du réalisme

## 13. Éclairage moteur par défaut et marge de réalisme

L'éclairage moteur par défaut n'est « que multiplication » — ni specular, fresnel, séparation chaud/froid, ni ambiant hémisphérique n'existent. Voici ce qui se reconstruit :

| Fonction | Par défaut | Reconstructible en packs ? |
|---|---|---|
| Diffus (Lambert) | Somme scalaire des directionnelles seules | ◎ Maison avec `bloxdSunDirection()` (sources enveloppées etc.) |
| Specular | Néant | ◎ Blinn-Phong (R9.2) |
| Fresnel | Néant | ◎ Approximation de Schlick (R9.3) |
| Séparation torche chaude / ciel froid | Sans couleur | ◎ (R9.1) |
| Ambiant hémisphérique | Sans direction | ◎ Ciel dessus / sol dessous (R9.4) |
| Mappage de tons | Néant (clamp seul) | ◎ ACES filmique (R9.5) |
| Perspective aérienne | Brouillard seul (remplacement de couleur) | ◎ Désaturation à distance (R9.6) |
| Détail de surface | Résolution de texture seule | △ Micro-relief procédural au hachage (R9.8) |
| Ondes de sommets (eau) | Néant (plan) | ◎ Allow seul (R7) |
| Normales de vague / scintillement solaire | Néant | ◎ (R9.7) |
| Clair de lune nocturne | La couleur du ciel s'assombrit seulement | △ La direction lunaire est en `-bloxdSunDirection()` : pseudo looks (ambiant bleu en R2 / désaturation en R9.11) plus clair de lune directionnel (R-A, cycle jour/nuit seul) |
| Ombres (occlusion du ciel) | Doux mélange via `mix(ambiant, ciel, skyLight)` seul | ◎ Inversion du lift + coupe par seuil + porte solaire (R9.12). L'ombre des arbres et sous les toits chute nettement, suivant les éditions de blocs en temps réel |

## 14. Deux écoles d'implémentation

**École A : retouches additives (depuis defaultLight)** — utilise `engineColour` (couleur terminée) comme base et ajoute éclat chaud ou rim. Facile et sûr, mais le modèle d'éclairage reste celui par défaut.

**École B : rééclairage total (depuis s.colour)** — écarte `l.engineColour` et reconstruit l'éclairage depuis `s.colour` (albedo) et les matériaux LightIn bruts. La vraie voie du réalisme. Quatre règles :

1. **Réappliquez le brouillard** : le hook light tourne post-brouillard ; appliquez `mix(l.fogColour, col, l.fogVisibility)` vous-même (R9.10). Par brouillard dense, posez un plancher avec `max(l.fogVisibility, 0.3)`. Et à l'inverse : mélanger plus de couleur de brouillard dans des packs basés sur engineColour produit un double brouillard blanc
2. **Repli unlit** : passez à `defaultLight` hors `#ifdef BLOXD_LIGHTING`
3. **Protégez des fonctions partagées entières** : entourez en `#ifdef BLOXD_LIGHTING` en fonctions complètes les fonctions partagées prenant `BloxdLightIn` (protéger seuls les appels ne suffit pas)
4. **Sans direction solaire** : si `bloxdSunDirection()` est zéro, ne calculez pas de specular directionnel. `l.directional` est un scalaire de quantité de lumière, pas un vecteur de direction : il ne restaure pas la direction du reflet. Basculez sur un ambiant faible sans direction si besoin. La direction lunaire est disponible via `-bloxdSunDirection()` (ne bouge que dans les mondes à cycle jour/nuit. [Partie VII](07-internals.md) R-A)

## 15. Looks inatteignables (le « plafond » du réalisme)

| Look | Motif |
|---|---|
| Shadow maps pixellisées (ombres tournant avec le soleil, pénombre) | Textures de profondeur non référençables (`bloxdOpaqueBehind()`, en liquides seuls, n'est que de l'info géométrique : inutilisable en shadow maps). L'occlusion de rayons n'arrive pas aux hooks |
| SSAO | Sans accès à la profondeur de scène (seule l'AO de sommets du mesher ; la profondeur en liquides seuls ne sert pas au SSAO) |
| SSR (reflets) | Couleur de scène inaccessible. Pseudo looks seuls mêlant la couleur du ciel via fresnel |
| Bloom / glare | Sans hook au post-traitement |
| Profondeur de champ, aberration chromatique, grain | Post-traitement plein écran requis |
| Lumière volumétrique (god rays) | Idem |
| Textures PBR | Lectures de textures interdites. Pseudo estimation seule depuis la luminance de couleur |
| Réfraction sous-marine | Couleur de scène inaccessible. Mais la profondeur en liquides seuls (`bloxdOpaqueBehind()`) permet absorption par épaisseur et projection du fond ([partie VIII](08-apiv2.md) R-E) |
| Voile sous-marin (teinte bleue) : retirer / changer | Le voile est un quad emissive plein écran généré depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné hors des pipelines de hooks (tout devant) : le pack ne peut en changer ni couleur ni densité |
| Détection sous-marine directe | Aucune entrée n'indique la submersion de caméra, et fogStart / fogEnd / fogColour ne changent pas sous l'eau : il n'existe pas non plus de moyen fiable de l'estimer depuis fogVisibility etc. |

### La vérité sur les ombres — les « ombres d'arbres » se font

Seuls les **shadow maps pixellisées tournant avec le soleil** sont impossibles dans le tableau. Le moteur calcule déjà des « ombres » depuis le début, et c'est `skyLight`. Le LightEngine côté maille utilise un algorithme façon Minecraft :

1. **Balayage de colonnes** : parcourt chaque colonne (x,z) de haut en bas. La lumière du ciel part de 15, devient **0 aux blocs opaques**, en s'atténuant à la descente avec `lightFilter` (air 1 / eau 3 / opaque 15)
2. **Remplissage BFS** : s'étend latéralement vers 6 voisins (-1 par bloc) — ceci adoucit les bords d'ombre. La valeur brute sous occlusion de rayon r vaut (15-r)/15
3. blockLight (torches etc.) est un BFS séparé à 3 canaux RVB (empaqueté 4bit)

Donc `l.skyLight` n'est pas un simple paramètre de luminosité mais **la donnée d'occlusion voxel de « le ciel est-il visible d'ici » = une carte d'ombres**. Sous les arbres, sous les toits et à l'intérieur, elle est déjà numériquement basse, arrivant lissée par interpolation de sommets. Poser/casser des blocs recalcule aussitôt = **des ombres qui suivent en temps réel**. Vanilla ne l'utilise que « doucement » via `mix(ambiant, ciel, skyLight)`.

Les bons outils sont les deux étapes de R9.12 (**restaurer les valeurs brutes via inversion du lift → binariser par seuil `smoothstep`**. `th = 1 - r/15` règle directement le « rayon d'occlusion traité comme ombre ») plus **ouvrir le soleil direct avec sky** (le soleil n'atteint que le ciel visible = l'essence de la projection), avec teinte chaude au soleil / froide à l'ombre.

**Limites honnêtes** : ces ombres partent du « ciel vers le haut » et **ne tournent donc pas quand le soleil bouge**. La résolution est par bloc (les bords doux viennent de la dispersion BFS). Le gabarit d'éclairage contient encore un stub fermé `var shadow: f32 = 1.;` pour les shadow maps (toujours 1.0 = désactivé) — interprété comme trace d'ombres rotatives pixellisées « planifiées ». Si ces ombres sont indispensables, seules des voies hors API restent (p. ex. injection GLSL par userscript, avec risque de politique).

### La réalité sous-marine

Les looks sous-marins constent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light s'appellent normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné tout devant. Le réglage `cameraTint` gagne s'il existe | Non (ni couleur ni densité changeables) |
| ③ cameraTint | Réglage du jeu | Non |

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogVisibility ne le détecte pas non plus).

## 16. Astuces de débogage

- Grottes trop claires → manque de courbe non linéaire de `skyLight` (recette de grottes R2 / R9.9)
- Jours cramés → baissez l'exposition pré-ACES
- Nuits trop noires → assurez un ambiant minimum (le `skyLightColour` nocturne est presque noir par prémisse)
- Lointain trop brumeux → baissez les coefficients aériens
- Tout orange autour des torches → baissez la proportion chaude (conservez de la lumière brute teintée)
- Blocs presque tout blancs → le total de sortie du hook light dépasse 1.0 (sans clamp en aval). Terminez avec `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanc sans additions → inversion un-fog par division avec fogVisibility. Retirez un-fog ; reconstruisez depuis `s.colour` et `mix` de brouillard une seule fois à la fin
- Blocs émissifs qui ne brillent pas → manque de re-ajout d'emission en recettes de reconstruction. Ajoutez `+ s.emission * l.fogVisibility`
- La nuit, seules restent des faces éclairées → n'assombrissez pas que les ombres ; atténuez toute la couleur terminée (`engineColour`) de nuit. Pour conserver les lampes locales, atténuez moins avec `blockLight` / `heldLight` ([Partie VI](06-implementation.md), section 19)
- L'ombre ne se creuse pas avec `pow(skyLight, γ)` → `l.skyLight` est post-courbe (section 10). Passez à inversion + seuil de R9.12
- Régler surface/densité d'ombre → guide de réglage de R9.12 (surface = seuil `shTh` / bord = `shSoft` / obscurité du cœur = double réglage d'ambiant minimum et de dispersion du ciel)
