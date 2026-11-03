# Erreurs de compilation

> API cible : 5 · État : Verified

Erreurs qui passent la validation statique mais échouent en tant que WGSL, ou qui n'échouent que dans le compilateur WGSL du navigateur (étape 2).

## "bloxdTerrainVertex must be declared as: fn ..."

- **Cause** : non-concordance de signature de hook (types d'arguments/retour)
- **Correction** : réécrivez selon la déclaration montrée dans le message (les noms de paramètres sont libres ; les types doivent correspondre exactement)
- **Prévention** : partez du [tableau comparatif des hooks](../api/hooks.md)

## "mixing '*' and '^' requires parenthesis (only in ...)"

- **Cause** : le WGSL exige des parenthèses quand on mélange `^` `&` `|` `<<` `>>` avec d'autres opérateurs
- **Correction** : mettez les opérandes entre parenthèses

## "... can only be a function's parameter or return type, ..."

- **Cause** : `var x: BloxdSurface;` — les déclarations nues annotées d'un type sont rejetées car les structures de l'en-tête gagnent des champs
- **Correction** : `var out = bloxdDefaultSurface(s);` (ou `var out = s;` dans les hooks de lumière)
- **Prévention** : construisez toujours les sorties depuis les `bloxdDefault*` ([conventions](../api/structures.md#conventions-décriture-rappel))

## "_ can only be the target of a phony assignment, as in _ = f();"

- **Cause** : `let _ = f();` est du WGSL invalide
- **Correction** : écrivez `_ = f();`

## "Lite: …reads scene depth on a page that didn't turn it on"

- **Cause** : un pack lisant la profondeur (`bloxdOpaqueBehind`) était actif quand la page a été générée ; la disponibilité de la profondeur se décide à la génération de la page
- **Correction** : rechargez la page avec le pack actif

## Le signe de dpdy semble inversé

- **Comportement voulu** : l'analyseur réécrit automatiquement tout appel `dpdy` / `dpdyCoarse` / `dpdyFine` en `(-dpdy(...))` (le y en espace écran pointe vers le bas)
- **Correction** : rien — écrivez `dpdy(h)` avec l'intention « comment h varie-t-il quand on monte » et le code émis porte l'inversion ([Restrictions](../api/restrictions.md#réécritures-automatiques))
- `dpdx` et `fwidth` restent inchangés

## Le pack est écarté à l'entrée en jeu / le contrôle sur appareil ne se termine jamais

- **Cause** : le contrôle sur appareil a échoué, ou a atteint le délai impératif de 60 secondes (`skipped`) — courant sur les appareils peu puissants et les mondes lourds
- **Correction** : réduisez le travail lourd sur les sommets et les boucles complexes ; voir [Performance](performance.md)

## Voir aussi

- [Erreurs de validation](validation.md) · [Engine Internals : compilation WGSL](../internals/wgsl-compilation.md) · [Restrictions](../api/restrictions.md)
