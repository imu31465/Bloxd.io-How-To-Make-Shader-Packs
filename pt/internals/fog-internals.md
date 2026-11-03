# Interioridades da névoa

> API alvo: 5 · Build alvo: `ab90qa` (2026-11-03, produção) · Estado: Analyzed (análise de JavaScript do bundle de produção)
O cálculo da névoa é sempre modo LINEAR (equivalente a `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), com `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de distância da névoa; só D = 0 é especial, com fogEnd = 5). **A banda de gradiente da névoa tem apenas 32 blocos de largura**, e `l.fogAlpha` é menos "bruma por distância" que uma **distância normalizada até a borda do mundo carregado**. Ela varia por jogador conforme a distância de carregamento, então efeitos baseados em distância devem calcular `distance(l.position, bloxdEyePosition())` eles mesmos (a seção "Banda da borda de carga" abaixo). (a função de névoa do renderizador na verdade implementa **quatro** modos — desativada / exponencial / exponencial ao quadrado / linear —, e são os títulos publicados que acionam o linear; o código-fonte restaurado e o argumento de robustez estão preservados em [Histórico de versões: v3](../history/v3.md).)

A cor de névoa padrão é `rgb(183, 191, 195)` (cinza-azulado pálido). Criadores de mundos podem alterá-la via `fogColourOverride` (hex). Com o modo de névoa 0 (NONE), **fogColour chega preto**. A forma padrão `bloxdApplyFog(col, l)` é segura, pois a cor de névoa não é usada quando fogAlpha é 0. A API de script tem mais duas opções, `fogChunkDistanceOverride` e `fogOnSkybox`: jogos personalizados podem definir de forma independente a distância da névoa (o valor D) e a aplicação da névoa ao skybox. Por padrão o skybox não é afetado pela névoa (apenas em jogos que ativam `fogOnSkybox` o skybox também fica tingido pela cor da névoa).

Definir `showFog` como false do lado do jogador empurra a névoa para 3200–3232 blocos, desativando-a na prática (`fogAlpha ≈ 0` continua voltando).

## Banda da borda de carga — fogAlpha como "borda do mundo"

Esfria discretamente apenas a banda de 32 blocos da borda de carga para disfarçar a borda do mundo (ou enfatizá-la como efeito). Sem distância calculada por conta própria, então o efeito segue automaticamente os ajustes de distância de carregamento do jogador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = dentro (margem até a borda), 1 = prestes a sair da borda
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
