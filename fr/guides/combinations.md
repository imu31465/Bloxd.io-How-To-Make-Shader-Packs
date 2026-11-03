# Combiner avec d'autres packs quand le shader seul touche sa limite



Comme les packs ne peuvent ni ajouter ni échantillonner de textures, n'essayez pas de résoudre les fins reliefs de matériau ou les images du ciel par shaders seuls. Le dépôt public de packs de textures pour Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) gère textures, skybox, modèles, etc. par une autre voie.

Pour référence, des distributions communautaires « cinematic shader » analysées dans un cas se sont révélées être des packs de textures (textures 128x128 sans `pack.json` / `.wgsl`).

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

Les packs de textures ont leur propre spécification (pour référence) : la limite de taille est 25 Mo mesurée comme longueur de la chaîne JSON encodée en base64 ; encoder un PNG en base64 gonfle de +33 %, le plafond pratique pour les images brutes est donc ~18–19 Mo. Le CSS est traité par un simple analyseur regex — évitez l'imbrication et les commentaires.
