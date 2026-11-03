# Éclairage moteur par défaut et marge de réalisme



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
