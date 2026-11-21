# Funktionsweise der Textur-Registry

> Ziel-API: 5 · Zweck: Texturen über Namen referenzieren

Shader-Packs referenzieren Texturen über benannte Konstanten und nicht über numerische IDs. Die Konstanten verwenden das Format `bloxdTextureId<Name>`. Verfügbare Namen stehen im [Texturkatalog](../api/texture-catalog.md).

## Namensauflösung

Beim Laden eines Packs löst der Loader jede benannte Konstante anhand der verfügbaren Texturnamen auf. Ändert sich die interne Anordnung, während ein Name verfügbar bleibt, kann das Pack die Textur weiterhin über ihren Namen referenzieren.

**Schreibe keine numerischen Textur-IDs direkt in WGSL.** Interne IDs und Atlaspositionen können sich ändern, wenn Spielinhalte aktualisiert werden. Benannte Konstanten halten den Pack-Code unabhängig von diesen internen Positionen.

## Animation und Rotation

- **Animation:** Verwende den Basisnamen wie `lava` statt Frame-Schreibweisen wie `lava0`–`lava7`. Beim Sampling wird das aktuelle Frame ausgewählt.
- **Rotation:** Verwende den im Katalog aufgeführten Basisnamen statt interner Rotations-Slots. Das Sampling berücksichtigt die Rotation der Fläche.
- **Frame-Übergänge:** Die Engine besitzt interne Slots zur Interpolation benachbarter Animationsframes. Packs sollten weiterhin die regulären benannten Konstanten verwenden.

## Verwandte Seiten

- [Texturkatalog](../api/texture-catalog.md) — verfügbare Namen und Konstanten
- [Textur-API](../api/texture-api.md) — Texturauflösung und Sampling
- [Textur-Sampling-Interna](texture-sampling.md) — Funktionsweise des Samplings
