# Validierung

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Verified

## Die 3-stufige Ladeprüfung

1. **Loader-Limits** — Größe, Form, Manifest-Gültigkeit (siehe [Pack-Struktur](pack-structure.md))
2. **Statische Validierung (Analyzer)** — Syntax, Typen, reservierte Namen, strict-Vertrag, über alle 6 Varianten
3. **Echte WebGPU-Kompilierung im Browser** — das Typ-Prüfen der statischen Validierung ist unvollständig, manche Fehler tauchen daher erst hier auf

Zum Lesen der einzelnen Fehler siehe [Fehlerbehebung](../troubleshooting/) (nach Symptom gegliedert).

## Ablauf

1. Die Zip oder den Ordner aus Einstellungen → Shader Pack laden
2. Status prüfen: „Ready. Reload the page to use it.“ direkt nach der Auswahl; **nach einem Seiten-Reload** bedeutet „Ready to use“ Erfolg
3. Bei „Saved, but it won't run until you fix these errors...“ die aufgelisteten Fehler beheben (Datei:Zeile + Variante) und neu laden
4. Zuerst in einem permissiven Spiel testen, dann in einem strict-Modus-Spiel (die meisten Spiele). Vertex-Animation funktioniert nur in allow-Spielen
5. Ein Paket zu ersetzen lädt vom selben Bildschirm neu; Änderungen brauchen einen Seiten-Reload
6. Mit Remove Pack entfernen. Nach Spiel-Updates revalidieren gespeicherte Pakete beim Seitenladen automatisch (Header-/Registry-Änderungen markieren sie als „muss erneut geprüft werden“)

## Testcheckliste auf dem Gerät

Siehe den [Test-Leitfaden](../guides/testing.md) für die vollständige Checkliste und die komplette Liste der Faktoren, die verändern, was ein Paket sieht.
