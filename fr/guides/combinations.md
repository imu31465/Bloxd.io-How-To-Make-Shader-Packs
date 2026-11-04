# Combiner avec des packs de textures

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
Comme les packs de shaders ne peuvent ni ajouter ni échantillonner de textures, n'essayez pas de résoudre le fin relief des matériaux ou les changements d'images du ciel par les shaders seuls. Le dépôt public de packs de textures pour Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) gère textures, skybox, modèles, etc. via un autre système.

Pour référence, des distributions communautaires « cinematic shader » analysées dans un cas se sont révélées être des packs de textures (textures 128x128 sans `pack.json` / `.wgsl`).

En pratique, **réglez la lumière et la couleur avec les shaders, et couvrez les matériaux et le ciel avec un pack de ressources assorti**. Mais vérifiez la co-utilisation et l'ordre de chargement selon l'implémentation et les réglages du jeu.

Les packs de textures ont leur propre spécification (pour référence) : la limite de taille est de 25 Mo, mesurée comme longueur de la chaîne JSON encodée en base64 ; encoder un PNG en base64 le gonfle de +33 %, donc le plafond pratique pour les images brutes est ~18–19 Mo. Le CSS est traité par un simple analyseur à base de regex — évitez l'imbrication et les commentaires.
