# Modell-Probleme

> Ziel-API: 5 · Ziel-Build: `ab90qa` · Status: Analyzed (neues v5-Territorium)

Probleme rund um die neuen v5-Model-Hooks.

## Spieler/Mobs unbeeinflusst

- **Ursache**: Entities (Spieler, Mobs, NPCs, Rüstung, Kosmetik) zeichnet das **Model-Programm** — Terrain-Hooks fassen sie nie an
- **Fix**: Model-Hooks hinzufügen ([der Modelle-Leitfaden](../guides/models.md))

## Stufen, Treppen, Pflanzen unbeeinflusst

- **Ursache**: Block-Modelle (`slab` / `stairs` / `flat`) sind ebenfalls Model-Programm-Geometrie, nie Terrain
- **Fix**: Model-Hooks mit `flags.slab` / `flags.stairs` / `flags.flat` benutzen ([Flags](../api/flags.md))

## Wasser unbeeinflusst

- **Ursache**: Wasser ist Liquid-Hook-only; **ohne Liquid-Hooks läuft auf Wasser auch kein Terrain-Hook** (v5-Änderung)
- **Fix**: `bloxdLiquidSurface` / `bloxdLiquidLight` definieren ([Varianten-Probleme](variants.md))

## Nur gehaltene Items ändern wollen, aber alles ändert sich

- **Fix**: mit `surface.flags.held` auswählen ([Modell-Shader-Rezepte](../recipes/model-shaders.md))

## Flag-Prüfungen verhalten sich falsch

- **Wahrscheinliche Ursachen**:
  1. **Flags als Single-Choice-Enumeration behandelt** — sie kombinieren sich frei („sandstone is sand and rock“, „possibly even none“) ([Flags](../api/flags.md#flags-combine-freely))
  2. `else` als „alles Übrige“ gelesen — das else von `flags.rock` ist bloß „kein Gestein“, möglicherweise weiterhin Sand
- **Fix**: Material-Flags (`opaque`…) unabhängig von Form-/Zustands-Flags (`slab`/`held`…) kombinieren

## Enchant-Glint verschwunden

- **Fix**: `enchantColour` durchreichen oder `bloxdLitColour()` benutzen ([Enchant-Effekte](../recipes/enchant-effects.md))

## Schadens-Blitz verschwunden / zu stark

- **Fix**: `overlayColour` durchreichen oder `out.overlayColour.a` justieren ([Enchant-Effekte](../recipes/enchant-effects.md))

## localPosition liest immer 0

- **Absicht**: `localPosition` ist auf Terrain- und Liquid-Flächen `vec3f(0.0)` — **kein Modell dort**
- **Fix**: in Model-Hooks lesen ([Modell-Rezepte](../recipes/model-shaders.md))

## bloxdTexel liefert auf Modellen weiß

- **Absicht**: `textureId: 0` (Skins) sampelt weiß
- **Fix**: mit `surface.textureId != 0u` auswählen oder von `surface.colour` ausgehen ([Textur-Probleme](textures.md))

## Nur-Rüstungs- / Nur-Kosmetik-Änderungen wollen

- **Grenze**: kein Flag sagt „Rüstung“; `flags.lifeform` schließt Rüstung und Kosmetik ein
- **Näherung**: mit `localPosition` (Platzierung) oder dem Vorhandensein von `overlayColour` kombinieren ([Modell-Rezepte](../recipes/model-shaders.md))

## Verwandte Seiten

- [Modelle-Leitfaden](../guides/models.md) · [Modell-Shader-Rezepte](../recipes/model-shaders.md) · [Flags](../api/flags.md)
