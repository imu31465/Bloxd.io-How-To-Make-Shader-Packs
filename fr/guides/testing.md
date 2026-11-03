# Liste de tests en jeu



Succès de compilation et « bel aspect » sont deux choses différentes. Vérifiez dans cet ordre :

1. **Chargement :** `pack.json` à la racine du ZIP. Juste après la sélection s'affiche `Ready. Reload the page to use it.` et le pack devient actif **au rechargement de la page** ; confirmez `Ready to use` ensuite. Les packs sauvegardés sont revalidés automatiquement au prochain chargement de page : à chaque mise à jour de l'en-tête de spec côté moteur, le contenu de l'en-tête est vérifié par empreinte (succès = reste tel quel / échec = affiché bloqué), donc un ancien pack cassé ne reste jamais silencieusement actif.
2. **6 variantes :** sans oublis de gardes de types en strict / allow, éclairage on / off, terrain / liquide. Même si un jeu n'use que de certaines conditions, les packs de distribution doivent assumer les 8.
3. **Jour :** couleurs sans cramage par matériau (herbe, pierre, sable, bois) ; saut clair/sombre naturel entre dessus et côtés.
4. **Nuit :** comparez les mêmes matériaux en pleine lumière passée, ombres et près des torches. Si seules restent des faces éclairées, réglez l'atténuation d'exposition ; si tout s'assombrit, réglez la protection de lumière locale.
5. **Eau :** regardez depuis dessus, angles rasants, rives, sous l'eau et de nuit séparément. Comportement alpha et aspect sous-marin dépendent du compositing du jeu — ne jugez jamais d'un seul point de vue. Sous l'eau, le voile de définition liquide couvre devant (comme décrit dans [Partie VII](../internals/)) : les différences du pack se voient surtout en surface et sur le terrain derrière le voile.
6. **Bords et distance :** sans sauts de vagues/motifs aux transitions de chunk / origine ; sans double brouillard ni brume blanche au loin.
7. **Performance :** effets lourds en hash/trig/`pow` par fragment au minimum. Ajoutez le détail peu à peu et comparez les FPS.

## Contraintes connues comme prémisses

- Les packs se limitent aux hooks terrain / liquide — sans traitement du ciel, des entités ou de l'UI avec le même code.
- Aucune entrée pour ajouter shadow maps, reflets en espace écran, réfraction, bloom, etc. (la profondeur de scène est débloquée en liquides seuls via `bloxdOpaqueBehind()`. Voir [partie VIII](../history/v2.md)).
- `bloxdSeconds()` est un temps d'animation sans lien garanti avec le jour/nuit du jeu.
- Avec `bloxdSunDirection()` zéro, la vraie direction lunaire est inconnue, pas de la « physique de clair de lune » mais une approximation d'ambiance. Le clair de lune directionnel se construit depuis `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. [Partie VII](../internals/) R-A).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez `bloxdRenderOffset()` pour les effets dépendants du monde. Pour les motifs locaux du bloc, les coordonnées locales sont l'outil voulu.
