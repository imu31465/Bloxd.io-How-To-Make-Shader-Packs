# Identidade do sol e da lua



A fonte de `bloxdSunDirection()` é um buffer de direção solar reescrito só quando muda o tipo de skybox — o critério não é "se o céu tem sol" mas **"se o skybox é tipo terra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (céu procedural) | Não zero (defeitos abaixo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Sempre (0,0,0)** |

**A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). A noite se julga por altura solar — há lua acima quando `bloxdSunDirection().y < 0` (sol sob o horizonte). Mas em mundos padrão o sol é estático e a lua também — só os mundos com ciclo dia/noite a veem mover-se.

A direção solar padrão ronda `(-0.56, 0.81, -0.18)` (vetor unitário de inclination = −0.2 / azimuth = 0.55, estático). Referência prática para predizer direções de brilho ao testar pacotes de distribuição.

Os ciclos dia/noite não estão integrados no motor — inclination é um número estático que os mundos com dia móvel atualizam lado jogo. `bloxdSunDirection()` segue cada atualização.

As luzes direcionais do terreno são só 2 lâmpadas criadas ao arrancar a cena, de **direção e intensidade fixas, sem mudança dia/noite**. Em curto: **nenhum fator de brilho do terreno depende do tempo. Os "looks" dia/noite vêm só do skybox e bloxdSunDirection()**, assim os pacotes que escurecem de noite devem estimar a faixa horária desde bloxdSunDirection() (a técnica `sunPresent` de §19).

## R-A. Luar direcional — moonDir = −bloxdSunDirection()

Soma Lambert branco-azulado e especular fraca só enquanto a lua está acima. `moonUp` é 0 em mundos de sol estático padrão: ali nada acontece — **luar que só dispara em mundos com ciclo dia/noite, logo seguro**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // a lua está sempre exatamente oposta ao sol; auto-off diurno via moonDir.y < 0
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
