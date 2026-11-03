# Distribution

> API cible : 5 · État : Verified

## Format de publication

1. Zip avec `pack.json` à la racine, dans les limites de taille ([Structure du pack](pack-structure.md))
2. Vérifiez que `pack.json` se trouve à la racine du zip (un unique dossier racine commun est retiré automatiquement)
3. Soignez `name` / `author` pour la publication

## Liste de contrôle avant publication

- [ ] `apiVersion: 5` (nombre, pas une chaîne)
- [ ] Les 6 variantes passent la validation (liste d'erreurs vide sur l'écran du chargeur)
- [ ] Vérifié visuellement dans un jeu allow comme dans un jeu strict
- [ ] Packs à animation de sommets / `discard` clairement signalés comme allow uniquement
- [ ] Jeux testés et date consignés dans les notes de version (les builds changent)

## Après la publication

- Les packs enregistrés par les joueurs se revalident automatiquement quand l'en-tête du moteur ou le registre de textures change avec une mise à jour du jeu
- **Les packs distribués en v1–v4 deviennent silencieusement inactifs** en v5 (voir [pack.json](manifest.md)) — les joueurs ne voient que la ligne de statut ; publiez et annoncez donc une version à jour
- Quand l'API évolue, suivez les étapes de migration de l'[Historique des versions](../history/), incrémentez la version et republiez
