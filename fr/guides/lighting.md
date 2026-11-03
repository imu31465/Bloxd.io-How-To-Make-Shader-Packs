# Comment fonctionne l'éclairage

> API cible : 5 · Build cible : `ab90qa` (2026-11-03, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
L'éclairage par défaut du moteur est « multiplication seule » — aucun specular, fresnel, séparation chaud/froid ni ambiant hémisphérique n'existe. Voici ce qui se reconstruit :

| Fonctionnalité | Par défaut | Reconstructible en packs ? |
|---|---|---|
| Diffus (Lambert) | Somme scalaire des lumières directionnelles seules | ◎ Sur mesure avec `bloxdSunDirection()` (atténuation enveloppée etc.) |
| Specular | Néant | ◎ Blinn-Phong (R9.2) |
| Fresnel | Néant | ◎ Approximation de Schlick (R9.3) |
| Séparation torche chaude / ciel froid | Sans couleur | ◎ (R9.1) |
| Ambiant hémisphérique | Sans direction | ◎ Ciel au-dessus / sol en dessous (R9.4) |
| Mappage de tons | Néant (clamp seul) | ◎ ACES filmique (R9.5) |
| Perspective aérienne | Brouillard seul (remplacement de couleur) | ◎ Désaturation à distance (R9.6) |
| Détail de surface | Résolution de texture seule | △ Micro-relief procédural par bruit de hachage (R9.8) |
| Ondes de sommets (eau) | Néant (à plat) | ◎ Allow seul (R7) |
| Normales de vagues / scintillement solaire | Néant | ◎ (R9.7) |
| Clair de lune nocturne | La couleur du ciel s'assombrit seulement | △ Pas d'entrée de direction lunaire, donc uniquement des looks pseudo (ambiant bleu en R2 / désaturation en R9.11) |
| Ombres (occlusion du ciel) | Doux mélange via `mix(ambiant, ciel, skyLight)` seul | ◎ Inversion du lift + coupe par seuil + porte solaire (R9.12). L'ombre des arbres et des zones sous toit chute nettement, en suivant les éditions de blocs en temps réel |
