# Prérequis

> API cible : 5 · État : Verified

## Navigateur

Les packs de shaders ne concernent que le renderer WebGPU. Il vous faut un navigateur capable de WebGPU :

- Navigateurs basés sur Chromium (Chrome / Edge / Opera etc.) — stables sur ordinateur de bureau
- Safari 17+ / Firefox (la prise en charge de WebGPU varie selon les périodes)
- **Mobile** : la prise en charge de WebGPU peut être limitée sur iOS / Android. Mentionnez-le sur la page de publication de votre pack

Tant qu'un pack est installé, le réglage du jeu pour le renderer WebGPU est activé de force.

## Environnement de développement

Aucun outil particulier n'est requis, mais ceux-ci aident :

- Un éditeur de texte (la coloration syntaxique WGSL est un plus)
- Un outil de zip pour la distribution ; pendant le développement, vous pouvez charger depuis un dossier (navigateurs de bureau uniquement)
- Les outils de développement du navigateur — les erreurs de compilation s'affichent dans l'interface du jeu et aussi dans la console

## Environnements de vérification sur appareil

Avant la distribution, vérifiez sur ([Validation](validation.md)) :

1. Un jeu en mode allow (obligatoire si vous utilisez l'animation de sommets)
2. Un jeu en mode strict (la plupart des jeux sont stricts)
3. Un rechargement de page (les packs enregistrés se revalident automatiquement)

## Mise en garde sur les paramètres d'URL

Des overrides de renderer restants dans les paramètres d'URL ou le localStorage empêchent les packs de démarrer — effacez-les et rechargez la page.
