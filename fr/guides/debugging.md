# Astuces de débogage

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
- Grottes trop claires → courbe non linéaire de `skyLight` manquante (recette de grottes R2 / R9.9)
- Jours cramés → baissez l'exposition pré-ACES
- Nuits trop sombres pour y voir → sécurisez un ambiant minimum (le `skyLightColour` nocturne est quasi noir par prémisse)
- Lointain trop brumeux → baissez les coefficients aériens
- Abords des torches tout orange → baissez la proportion de mélange chaud (conservez un peu de lumière brute teintée)
- Blocs presque tout blancs → le total de sortie du hook light dépasse 1.0 (pas de clamp en aval). Terminez par `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanc sans additions → inversion du un-fog par division de brouillard. Abandonnez le un-fog ; reconstruisez depuis `s.colour` et appliquez le brouillard avec `mix` une seule fois à la fin
- Les blocs émissifs ne brillent pas → ré-ajout d'emission manquant dans les recettes de reconstruction. Ajoutez `+ s.emission * (1.0 - l.fogAlpha)`
- La nuit est incorrecte seulement sur les faces éclairées → n'assombrissez pas uniquement les couleurs d'ombre ; atténuez toute la couleur terminée du moteur (`engineColour`) la nuit. Pour garder les lampes locales, affaiblissez l'atténuation avec `blockLight` / `heldLight` ([Concevoir des looks nocturnes](night.md))
- L'ombre ne se creuse pas, quel que soit `pow(skyLight, γ)` → `l.skyLight` est post-lift (section 10). Passez à l'inversion + coupe par seuil de R9.12
- Régler l'étendue/la densité des ombres → voir le guide de réglage de R9.12 (étendue = seuil `shTh` / bord = `shSoft` / obscurité du cœur = décalage à deux points de l'ambiant minimum et de la diffusion du ciel)
