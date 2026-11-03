# Interioridades da amostragem de texturas

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado do gerador em produção, c56)

Como `bloxdTexel` / `bloxdTextureSize` realmente compilam — o codegen de texturas de 3 variantes. O lado do usuário: [API de texturas](../api/texture-api.md).

## As três variantes

### Variante 1 — pacote de texturas inativo (stubs)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

Código escrito para o atlas real ainda compila e roda aqui — ele só vê texels brancos e um tamanho 1×1.

### Variante 2 — o caminho do atlas (o padrão do jogo)

`bloxdTextureSize` devolve `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` aplica o quarto de volta da face antes da leitura — a armadilha de rotação escrita como a cadeia de `if` gerada de `bloxdSpTurned`:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` é o armazenamento que o próprio motor faz do campo de entrada `textureRotation`.)

### Variante 3 — texturas de pacotes de texturas personalizados

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` amostra a célula por textura do atlas em camadas; os texels próprios do pacote passam pelo caminho `bloxdSpOwnTexel`.

## A escada de quadros de animação

Texturas animadas (42 famílias) avançam em intervalos fixos por família (200 / 250 / 300 ms — a coluna de intervalo no [catálogo de texturas](../api/texture-catalog.md#famílias-de-animação-42-nomes)). Passar um id de família de animação a `bloxdTexel` amostra o quadro atual.

## Ajustes do sampler

As texturas de blocos são uma `texture_2d_array`; o sampler do terreno é nearest + repeat.

## Greedy meshing e UV

O mesher funde faces com material/AO/luz correspondentes num único retângulo (**greedy meshing**), então as UVs de vértice podem exceder a largura de um tile em faces fundidas (bordas recuadas em 0.0015). O endereçamento repeat do hardware cuida do encaixe, então faces fundidas parecem sem costura — mas um detalhe procedural atrelado à `uv` pode ficar descontínuo nas fronteiras de fusão; atrele efeitos dependentes do mundo a `bloxdWorldPosition(position)`.

## Relacionado

- [API de texturas](../api/texture-api.md) · [Registro de texturas](texture-registry.md) · [Pipeline de renderização](rendering-pipeline.md)
