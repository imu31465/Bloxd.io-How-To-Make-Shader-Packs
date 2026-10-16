# Créer des packs de shaders pour Bloxd.io (Guide complet)

Guide autonome pour créer et distribuer des packs de shaders pour Bloxd.io (moteur WebGPU uniquement).
Basé sur la spécification `apiVersion: 2`. Le guide est découpé en un fichier par partie (ce README sert de sommaire ; le recueil de recettes se trouve dans `recipes.md`). Les packs v1 ne chargent pas dans le jeu actuel (la valeur `apiVersion` v1 et les anciens identifiants sont refusés). Pour migrer depuis la v1, voir la partie VIII (`apiv2.md`).

> Ce guide est non officiel et ne représente pas la position des développeurs. L'API peut changer sans préavis.  
> Dernière révision : 2026-10-15 (ordre d'application du brouillard, réglages réels du brouillard et rendu sous-marin vérifiés contre l'implémentation du moteur). Aucune référence officielle publique de l'API WGSL n'ayant été trouvée, continuez à vérifier descriptions et recettes face à l'écran de chargement et à la compilation en jeu.  
> La fonction de packs de shaders est une fonction officielle accessible depuis l'interface du jeu, et les packs sont du WGSL pur  
> (ni exécution JS ni réseau) : rien de dangereux ne se produit avec du code normal.  
> Ce guide a été créé avec l'assistance de l'IA ; l'exactitude n'est pas garantie. Vérifiez avec le comportement réel en jeu.

## Sommaire

- [Partie I : Créer des packs](making.md)
- [Partie II : Référence API](api.md)
- [Partie III : Recettes](recipes.md)
- [Partie IV : Guide du réalisme](realism.md)
- [Partie V : Dépannage et notes](troubleshooting.md)
- [Partie VI : Notes d'implémentation importantes](implementation.md)
- [Partie VII : Supplément d'intérieurs](internals.md)
- [Partie VIII : Guide de migration vers API Version 2](apiv2.md)
