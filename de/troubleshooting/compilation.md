# Kompilierfehler

> Ziel-API: 5 · Status: Verified

Fehler, die die statische Validierung bestehen, aber als WGSL scheitern — oder nur im WGSL-Compiler des Browsers scheitern (Stufe 2).

## „bloxdTerrainVertex must be declared as: fn ..."

- **Ursache**: Hook-Signatur-Nichtübereinstimmung (Argument-/Rückgabetypen)
- **Fix**: zur in der Meldung gezeigten Deklaration umschreiben (Parameternamen sind frei; Typen müssen exakt passen)
- **Vorbeugen**: von der [Hook-Vergleichstabelle](../api/hooks.md) ausgehen

## „mixing '*' and '^' requires parenthesis (only in ...)"

- **Ursache**: WGSL verlangt Klammern, wenn `^` `&` `|` `<<` `>>` mit anderen Operatoren gemischt werden
- **Fix**: die Operanden einklammern

## „... can only be a function's parameter or return type, ..."

- **Ursache**: `var x: BloxdSurface;` — nackte typ-annotierte Deklarationen werden abgelehnt, weil Header-Strukturen Felder gewinnen
- **Fix**: `var out = bloxdDefaultSurface(s);` (oder `var out = s;` in Light-Hooks)
- **Vorbeugen**: Ausgaben immer aus `bloxdDefault*` bauen ([Konventionen](../api/structures.md#schreibkonventionen-recap))

## „_ can only be the target of a phony assignment, as in _ = f();"

- **Ursache**: `let _ = f();` ist ungültiges WGSL
- **Fix**: `_ = f();` schreiben

## „Lite: …reads scene depth on a page that didn't turn it on"

- **Ursache**: ein tiefenlesendes Paket (`bloxdOpaqueBehind`) war aktiv, als die Seite generiert wurde; die Tiefen-Verfügbarkeit wird bei der Seiten-Generierung entschieden
- **Fix**: die Seite mit aktivem Paket neu laden

## dpdy-Vorzeichen sieht invertiert aus

- **Das ist Absicht**: der Analyzer schreibt jeden `dpdy` / `dpdyCoarse` / `dpdyFine`-Aufruf automatisch zu `(-dpdy(...))` um (Screen-Space-y zeigt nach unten)
- **Fix**: nichts — `dpdy(h)` in der Bedeutung „wie ändert sich h nach oben“ schreiben, und der emittierte Code trägt den Flip ([Einschränkungen](../api/restrictions.md#automatische-umschreibungen))
- `dpdx` und `fwidth` bleiben unberührt

## Paket wird beim Spiel-Beitritt rausgeworfen / die Geräte-Prüfung endet nie

- **Ursache**: die Geräte-Prüfung ist gescheitert oder lief in den erzwungenen 60-Sekunden-Timeout (`skipped`) — üblich auf schwachen Geräten und schweren Welten
- **Fix**: schwere Vertex-Arbeit und komplexe Schleifen reduzieren; siehe [Performance](performance.md)

## Verwandte Seiten

- [Validierungsfehler](validation.md) · [Engine-Interna: WGSL-Kompilierung](../internals/wgsl-compilation.md) · [Einschränkungen](../api/restrictions.md)
