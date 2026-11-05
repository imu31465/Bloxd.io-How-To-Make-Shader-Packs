# WGSL-Kompilierung

> Ziel-API: 5 · Ziel-Build: `bny9u` · Status: Analyzed (aus dem Live-Bundle restauriert)

Die zweite Validierungsstufe — echte Kompilierung durch den WGSL-Compiler des Browsers — und die Validierungs-Stubs von v5.

## Warum zwei Stufen

Das Typ-Prüfen der statischen Validierung ist unvollständig, deshalb tauchen manche Fehler erst hier auf (z. B. WGSL-Operator-Rangfolge-Regeln wie `mixing '*' and '^' requires parenthesis`). Fehler erscheinen In-Game mit dem Variantennamen ([Kompilierfehler](../troubleshooting/compilation.md)).

## Validierungs-Stub-Generierung

Die Engine synthetisiert Stubs für Code, der die statische Validierung bestanden hat (aus Modul 29866 restauriert):

- die Typ-Stub-Tabelle:

| Typ | Stub-Wert |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- Strukturen bauen sich rekursiv auf — jedes Feld mit Stub-Werten gefüllt (verschachtelte Strukturen rekursieren)
- die synthetisierten Entry-Points:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

Die Validierung kompiliert also wörtlich „WGSL, das deine Hooks mit Stub-Eingaben aufruft“ im Browser, und bringt Syntax-, Typ- und Sprachfeature-Verstöße an die Oberfläche.

## Namens-Restaurierung in Fehlermeldungen

Beim Spleißen von Hook-Aufrufen behält die Engine eine Bezeichner-Abbildung (`originalNames`). Bezeichner in Browser-Fehlern werden **zurück auf deine ursprünglichen Namen** abgebildet, und `sourceOf(lineNum)` bildet gespleißte Zeilennummern zurück auf (Datei, Zeile) — du liest Fehler gegen deinen eigenen Code, nicht gegen den transformierten Text.

## Laufzeit-Re-Validierung beim Beitritt

`checkCompilation` läuft pro Spiel-Beitritt und kompiliert tatsächlich jedes existierende Terrain-Material (strenger als die Prüfung im Einstellungsbildschirm). Scheitern wirft das Paket für dieses Spiel raus. Die Prüfung hat einen erzwungenen 60-Sekunden-Timeout ([Performance](../troubleshooting/performance.md)).

## Verwandte Seiten

- [Kompilierfehler](../troubleshooting/compilation.md) · [Shader-Validierung](shader-validation.md) · [Erste Schritte: Validierung](../getting-started/validation.md)
