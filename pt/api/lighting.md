# Iluminação

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Analyzed (restaurado verbatim do cabeçalho em produção)

A v5 publicou a API de iluminação. O que o motor fazia internamente (construir `litColour`) agora é chamável a partir dos pacotes. Esta página cobre as entradas, as funções e a ordem de processamento da iluminação como um sistema.

## O pipeline completo

A cadeia de cores completa, como a implementação padrão do estágio light (`bloxdDefaultLight`) a mostra:

```
surface.colour
    │  mistura com overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiplicação por bloxdShading(light) — resposta de material e ângulo
    ▼
shaded
    │  mistura com enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiplicação por bloxdWorldLight(light) — luz do mundo (a mais brilhante entre bloco/céu/mão)
    ▼
lit = bloxdLitColour(surface, light)   ← a cor "antes de emissão e névoa"
    │  + surface.emission               ← emissão somada após a iluminação
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (cor final)
```

Ordem de `bloxdLitColour()` (resumo do cabeçalho: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. aplique `overlayColour`
2. sombreie com `bloxdShading()`
3. aplique `enchantColour`
4. aplique a luz do mundo com `bloxdWorldLight()`

Ordem de emissão e névoa: **a emissão é somada depois da iluminação e antes da névoa**, e a névoa também atenua a emissão (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Funções

### bloxdLit() — a porta

```wgsl
fn bloxdLit() -> bool
```

Se a iluminação de bloco e céu está ativada. **Garantias quando desativada**:

| Campo | Valor quando desativada |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (branco) |

O `#ifdef BLOXD_LIGHTING` da v4 sumiu. Substitua-o por `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — resposta de material e ângulo

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multiplica `directional` (Lambert somado) por `diffuse` (resposta RGB do material), soma `emissive` (brilho do material) e `ambient` (ambiente RGB) e faz clamp para 0–1
- **as novas entradas da v5 `diffuse` / `emissive`** permitem trocar apenas o termo de Lambert mantendo a resposta de material do motor

### bloxdWorldLight() — a luz do mundo

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- molda cada um dos três canais (bloco / céu / mão) com `ambientLightColour` como piso e então toma o **mais brilhante**
- `skyLight` interpola de `ambientLightColour` em direção a `skyLightColour` conforme a quantidade de luz de céu

### bloxdLitColour() — a receita do motor

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — névoa

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = sem névoa, 1 = só fogColour** (invertido em relação ao `fogVisibility` da v4)
- `fogColour` é o RGB de névoa do jogo; **`vec3f(0.0)` quando o jogo não tem névoa**

### bloxdDefaultLight() — o padrão completo

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Campos de entrada (BloxdLightIn)

| Campo | Tipo | Significado | Nota |
|---|---|---|---|
| `litColour` | `vec3f` | RGB iluminado e encantado (antes de emissão e névoa) | um valor de resultado, não uma fonte |
| `directional` | `f32` | Lambert somado das luzes direcionais | 0 quando não há luzes direcionais |
| `diffuse` | `vec3f` | resposta RGB do material à luz direcional | permite a `bloxdShading()` reconstruir a resposta do material |
| `emissive` | `vec3f` | brilho RGB do material (somado à direcional) | |
| `ambient` | `vec3f` | ambiente RGB (somado à direcional) | |
| `blockLight` | `vec3f` | luz de bloco RGB | 0 quando `!bloxdLit()` |
| `skyLight` | `f32` | luz de céu | 1 quando `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | luz RGB mínima (piso) | 1 quando `!bloxdLit()` |
| `skyLightColour` | `vec3f` | cor RGB de skyLight | 1 quando `!bloxdLit()` |
| `heldLight` | `vec3f` | luz RGB na mão | 0 quando `!bloxdLit()` ou nada na mão |
| `fogColour` | `vec3f` | RGB da névoa do jogo | 0 sem névoa |
| `fogAlpha` | `f32` | 0 = sem névoa, 1 = só fogColour | invertido em relação ao `fogVisibility` da v4 |

## Física dos níveis de luz (contexto, dispensável)

- **`blockLight` / `skyLight` / `heldLight` chegam já mapeados a 0–1**: os níveis 0–15 passam por uma curva ease-out (p. ex. `6 → 0.45`, `12 → 0.92`). Todos excluem `ambientLightColour`
- **Curva de lift**: `skyLight` é na verdade "esta posição consegue ver o céu" — dados de oclusão por voxel, ou seja, um shadow map. A separação sol/sombra por limiar pode precisar da transformada inversa (veja o [guia de realismo](../guides/realism.md))
- **Interioridades da névoa**: no modo linear `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (com clamp 0..1), calculado por vértice em espaço de vista. A build atual é apenas linear (detalhes em [Interioridades do motor: interioridades da névoa](../internals/fog-internals.md))

## Receitas

### Sombreamento próprio + a luz do mundo do motor

O que os autores da v4 aproximavam escalando `litColour` agora pode ser escrito exatamente:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // já é o Lambert somado
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Mantenha a luz do mundo do motor, potencialize apenas a emissão

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Deslocamento azul noturno (dirigido por skyLight)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## Relacionado

- [Funções](functions.md) · [Guias: iluminação](../guides/lighting.md) · [Interioridades do motor: interioridades da iluminação](../internals/lighting-internals.md)
