# Interioridades da névoa



O cômputo de névoa é sempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), com `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de névoa; só D = 0 é especial com fogEnd = 5). **A banda de gradiente é de só 32 blocos**, e `(1.0 - l.fogAlpha)` é menos "bruma por distância" que **distância normalizada à borda do mundo carregado**. Varia por jogador com a distância de carga: efeitos por distância devem calcular `distance(l.position, bloxdEyePosition())` eles mesmos (receita R-B). (nota da v3: a função de névoa do renderizador implementa na verdade **quatro** modos — desativada / exponencial / exponencial ao quadrado / linear —, e os títulos publicados usam o linear; o código restaurado e o argumento de robustez estão na [Parte IX](../history/v3.md) §50.)

Cor de névoa padrão `rgb(183, 191, 195)` (cinza azul pálido). Criadores de mundos a mudam via `fogColourOverride` (hex). Com modo névoa 0 (NONE), **fogColour chega preto**. A forma padrão `mix(l.fogColour, col, (1.0 - l.fogAlpha))` é segura pois a cor de névoa não se usa a fogVisibility 1. A API de script oferece duas opções a mais, `fogChunkDistanceOverride` e `fogOnSkybox`: os Custom Games podem ajustar independentemente a distância de névoa (o valor D) e a aplicação da névoa ao skybox. Por padrão o skybox não é afetado pela névoa (só jogos que ativam `fogOnSkybox` tingem também o skybox com a cor de névoa).

Ajustar `showFog` para false empurra a névoa a 3200–3232 blocos, desativando de fato (`fogVisibility ≈ 1` segue vindo).

## R-B. Banda de borda de carga — fogVisibility como "borda do mundo"

Esfria em silêncio só a banda de 32 blocos da borda de carga para disfarçar o fim do mundo (ou enfatizá-la como efeito). Sem distância autocalculada: segue auto os ajustes de distância de carga do jogador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margem à borda), 0 = a ponto de sair da borda
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
