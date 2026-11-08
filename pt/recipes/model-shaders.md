# Shaders de modelo

> API alvo: 5 · Build alvo: `v98qt8` (verificado em produção 2026-11-08) · Estado: Analyzed (escrito contra a especificação do cabeçalho v5)

Receitas usando os hooks de Model do v5 e os novos flags para **seleções de "no que estou olhando" que eram impossíveis antes do v5**. Noções básicas: [Modelos e texturas](../guides/models.md).

## Brilho de item na mão

O que os autores de shaders em primeira pessoa queriam desde a v1, em duas linhas:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Separando o mundo da mão

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Pontas de lâmina brilhantes (localPosition)

`localPosition` gira com o modelo — "onde estou no modelo" sem adivinhações em espaço de mundo:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Nota: os intervalos reais de `localPosition` variam por modelo — verifique no dispositivo e aplique `clamp` defensivamente.

## Destacando itens caídos

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## Borda fria em skins de jogador (lifeform)

A maioria dos modelos usa `textureId: 0` (skins); `surface.colour` já tem skin × tinta:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## Plantas balançando ao vento (só allow)

Plantas (`flags.flat`) são desenhadas como modelos — balanço via hook de vértice:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(Vegetação também é `flags.vegetation`: `flat` = "desenhado como um plano cruzado", `vegetation` = "é uma planta" — grama e flores são ambos.)

## Somente faces de modelo com textura do atlas

Faces de modelos de bloco (lajes, escadas…) carregam `textureId`s do atlas; selecione com `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

Faces com `textureId: 0` (skins) amostram como branco — sem erro ([texturas próprias do modelo](../api/texture-api.md#texturas-próprias-do-modelo-textureid-0)).

## Armadura contra o resto

`flags.lifeform` inclui armaduras e cosméticos ([Flags](../api/flags.md)). Não existe entrada mais fina; combine `localPosition` (posicionamento) ou a presença de `overlayColour` como aproximações práticas.

## Compartilhando com o terreno

Graduação uniforme entre blocos completos e modelos de bloco:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

O padrão de função compartilhada é exatamente o que o próprio template de pacote padrão recomenda ([hooks](../getting-started/hooks.md#fallbacks-e-compartilhamento-de-código)).

## Relacionado

- [Modelos e texturas](../guides/models.md) · [Efeitos de encantamento](enchant-effects.md) · [Flags](../api/flags.md) · [Estruturas](../api/structures.md)
