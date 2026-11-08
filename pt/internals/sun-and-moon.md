# O sol e a lua

> API alvo: 5 · Build alvo: `v98qt8` (2026-11-08, produção e preprod) · Estado: Analyzed (análise de JavaScript do bundle de produção)
A fonte de `bloxdSunDirection()` é um buffer de direção do sol reescrito somente quando o tipo de skybox muda — o critério não é "se o céu tem um sol", e sim **"se o skybox é do tipo terra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (céu procedural) | Não zero (padrões abaixo) |
| `gloomy` / `interstellar` / `space_*` (texturas de cubo) | **Sempre (0,0,0)** |

**A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição da lua como o oposto exato do sol). A noite é julgada pela elevação do sol — a lua está no céu quando `bloxdSunDirection().y < 0` (sol abaixo do horizonte). Mas em mundos padrão o sol é estático, então a lua também é; apenas mundos que implementam um ciclo dia/noite a veem se mover.

A direção do sol em mundos padrão é cerca de `(-0.56, 0.81, -0.18)` (vetor unitário calculado a partir de inclination = −0.2 / azimuth = 0.55, estático). Uma referência prática para prever no papel as direções de brilho ao testar pacotes de distribuição.

Ciclos dia/noite não são embutidos no motor — inclination é um número estático, e mundos com dia/noite em movimento o atualizam do lado do jogo. `bloxdSunDirection()` acompanha cada atualização.

As luzes direcionais do terreno são apenas 2 lâmpadas criadas no início da cena, de **direção e intensidade fixas, sem variação dia/noite**. Em resumo: **nenhum fator de brilho do terreno depende do tempo. Os "looks" de dia/noite vêm somente do skybox e de bloxdSunDirection()** — portanto, pacotes que escurecem o terreno à noite devem estimar por conta própria a faixa de horário a partir de bloxdSunDirection() (a técnica `sunPresent` em [Projetando looks noturnos](../guides/night.md)).

## R-A. Luar direcional — moonDir = −bloxdSunDirection()

Adiciona Lambert branco-azulado e especular fraco somente enquanto a lua está no céu. `moonUp` é 0 em mundos padrão de sol estático, então nada acontece ali — **luar que só dispara em mundos com ciclo dia/noite, logo seguro**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // a lua está sempre exatamente oposta ao sol; desligamento automático de dia via moonDir.y < 0
        let moonDir = -bloxdSunDirection();
        let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
        if (moonUp > 0.0) {
            let n     = normalize(l.normal);
            let diff  = max(0.0, dot(n, moonDir));
            let view  = normalize(bloxdEyePosition() - l.position);
            let halfV = normalize(moonDir + view);
            let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
            out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
        }
}
    return out;
}
```
