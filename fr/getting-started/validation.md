# Validation

> API cible : 5 · Build cible : `xkg8x` (vérifié en production le 2026-11-04) · État : Verified

## Le contrôle de chargement en 3 étapes

1. **Limites du chargeur** — taille, forme, validité du manifeste (voir [Structure du pack](pack-structure.md))
2. **Validation statique (analyseur)** — syntaxe, types, noms réservés, contrat strict, sur les 6 variantes
3. **Vraie compilation WebGPU dans le navigateur** — le contrôle de types de la validation statique est incomplet, donc certaines erreurs n'apparaissent qu'ici

Pour lire chaque erreur, voir [Dépannage](../troubleshooting/) (organisé par symptôme).

## Procédure

1. Chargez le zip ou le dossier depuis Réglages → Shader Pack
2. Vérifiez le statut : "Ready. Reload the page to use it." juste après la sélection ; **après un rechargement de page**, "Ready to use" signale le succès
3. Sur "Saved, but it won't run until you fix these errors...", corrigez les erreurs listées (fichier:ligne + variante) et rechargez
4. Testez d'abord dans un jeu permissif, puis dans un jeu en mode strict (la plupart des jeux). L'animation de sommets ne fonctionne que dans les jeux allow
5. Remplacer un pack recharge depuis le même écran ; les modifications exigent un rechargement de la page
6. Supprimez avec Remove Pack. Après les mises à jour du jeu, les packs enregistrés se revalident automatiquement au chargement de la page (les changements d'en-tête ou de registre les marquent "needs re-check")

## Liste de contrôle des tests sur appareil

Voir le [guide de tests](../guides/testing.md) pour la liste de contrôle complète et la liste intégrale des facteurs qui changent ce que voit un pack.
