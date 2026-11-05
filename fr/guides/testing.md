# Liste de vérification en jeu

> API cible : 5 · Build cible : `bny9u` (2026-11-05, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
Une compilation réussie et un « bel aspect » sont deux choses différentes. Vérifiez dans cet ordre :

1. **Chargement :** `pack.json` se trouve à la racine du ZIP. Juste après la sélection, `Ready. Reload the page to use it.` s'affiche et le pack devient actif **au rechargement de la page** ; confirmez ensuite `Ready to use`. Les packs enregistrés sont revalidés automatiquement au prochain chargement de page : chaque fois que l'en-tête de spec côté moteur est mis à jour, le contenu de l'en-tête est vérifié par empreinte (succès = reste tel quel / échec = affiché comme bloqué), donc un ancien pack cassé ne reste jamais silencieusement actif.
2. **6 variantes :** aucune omission de gardes de types à travers strict / allow, éclairage activé / désactivé, terrain / liquide. Même si un jeu n'utilise que certaines conditions, les packs de distribution doivent assumer les 8.
3. **Jour :** aucune couleur cramée par matériau (herbe, pierre, sable, bois) ; répartition clair/sombre naturelle entre les dessus et les côtés.
4. **Nuit :** comparez les mêmes matériaux tels qu'en plein jour, puis à l'ombre et près des torches. S'il ne reste que des faces éclairées, réglez l'atténuation d'exposition ; si tout est sombre, réglez la protection de lumière locale.
5. **Eau :** regardez séparément de dessus, aux angles rasants, les rives, sous l'eau et de nuit. Le comportement de l'alpha et les looks sous-marins dépendent du compositing du jeu — ne jugez jamais d'un seul point de vue. Sous l'eau, le voile de définition liquide couvre tout devant (voir [Ce que les packs de shaders peuvent et ne peuvent pas faire](constraints.md#réalité-sous-marine)), donc les différences des packs se voient surtout en surface et sur le terrain à travers le voile.
6. **Bords et distance :** pas de vagues/motifs qui sautent aux transitions de chunk / d'origine ; pas de double brouillard ni de brume blanche au loin.
7. **Performance :** les effets lourds en appels hash/trig/`pow` par fragment doivent rester minimaux. Ajoutez le détail graduellement et comparez les FPS.

## Contraintes connues comme prémisses

- Les packs de shaders se limitent aux hooks terrain / liquide — pas de traitement du ciel, des entités ou de l'UI avec le même code.
- Il n'existe aucune entrée pour ajouter des cartes d'ombres, des reflets en espace écran, de la réfraction, du bloom, etc. (la profondeur de scène est débloquée en liquides seuls via `bloxdOpaqueBehind()` — voir [Fonctions](../api/functions.md)).
- `bloxdSeconds()` est un temps d'animation sans lien garanti avec le jour/nuit en jeu.
- Un `bloxdSunDirection()` nul signifie que la vraie direction de la lune est inconnue — pas de la « physique du clair de lune », mais une approximation d'ambiance. Le clair de lune directionnel peut se construire depuis `-bloxdSunDirection()` (mondes à cycle jour/nuit uniquement — [Le soleil et la lune](../internals/sun-and-moon.md)).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez donc `bloxdRenderOffset()` pour les effets dépendant du monde. Pour les motifs locaux au bloc, les coordonnées locales sont volontairement l'outil adapté.
