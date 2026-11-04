# Efeitos de encantamento

> API alvo: 5 · Build alvo: `xkg8x` (verificado em produção 2026-11-04) · Estado: Analyzed (restaurado do cabeçalho em produção)

O v5 abriu o pipeline de encantamento tanto nas entradas quanto nas saídas. Receitas para controlar o brilho de itens e armaduras encantados preservando a matemática do motor.

## Entradas e saídas

**Entradas** (`BloxdSurfaceIn` / `BloxdLightIn` — somente itens e armaduras encantados, tudo 0 caso contrário):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Saída** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

O motor faz a mistura dentro de [`bloxdLitColour()`](../api/lighting.md) — logo após o sombreado, antes da luz do mundo. `bloxdDefaultSurface` repassa a entrada sem alteração, então **o look padrão corresponde ao comportamento interno do motor da v4**.

## Entendendo os valores padrão

A entrada `enchantColour.a` é um alpha **animado** — o motor anima a varredura do brilho, então ler `.a` por fragmento produz um padrão em movimento de graça. `enchantTier` e `enchantSpeed` são consistentes por construção («faster at higher tiers»).

Faces não encantadas carregam `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

## Receita 1: realismo sem brilho (duas linhas)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## Receita 2: brilho mais forte por nível

`enchantTier` dá o clássico "brilho escalado por nível" sem precisar analisar cores:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## Receita 3: recolorir o brilho

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // níveis baixos azuis, altos roxos
        out.enchantColour = e;
    }
    return out;
}
```

## Receita 4: varredura dirigida por enchantSpeed

Transforme `enchantSpeed` em uma fase para uma varredura própria:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## Receita 5: amplificar o clarão de dano (overlayColour)

`overlayColour` (somente jogadores/mobs; clarão de dano etc.) se mistura antes da iluminação em `bloxdLitColour`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Inofensivo em não entidades (`overlayColour` vale 0 ali).

## Combinando com iluminação própria

Usar `bloxdLitColour()` mantém automática a mistura de encantamento/sobreposição:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Notas

- As entradas de encantamento chegam **somente em itens e armaduras encantados** — tudo 0 em terreno, água e faces não encantadas
- Mudar a saída `enchantColour` nunca toca `colour` diretamente — a mistura acontece em `bloxdLitColour` / `bloxdDefaultLight`
- Fora do pipeline de modelo as entradas de encantamento são sempre 0

## Relacionado

- [Iluminação](../api/lighting.md) · [Estruturas](../api/structures.md) · [Receitas de shaders de modelo](model-shaders.md)
