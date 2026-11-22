# O sol e a lua

> API alvo: 5 · Tipo: referência técnica
`bloxdSunDirection()` lê um buffer com a direção do sol, atualizado somente quando o tipo de skybox muda. O critério decisivo não é se o céu mostra um sol, mas **se o skybox é do tipo `earth`**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (céu procedural) | Diferente de zero (valores padrão abaixo) |
| `gloomy` / `interstellar` / `space_*` (texturas de cubo) | **Sempre (0,0,0)** |

Quando `bloxdSunDirection()` retorna um vetor diferente de zero, a direção da lua é `-bloxdSunDirection()` (o motor a posiciona exatamente no sentido oposto ao sol). Se retorna zero, esta função não informa a direção real da lua. A noite é determinada pela altura do sol: a lua está acima do horizonte quando `bloxdSunDirection().y < 0` (o sol está abaixo do horizonte). Nos mundos padrão, o sol é estático e a lua também; ela só se move em mundos que implementam um ciclo dia/noite.

A direção do sol em mundos padrão é cerca de `(-0.56, 0.81, -0.18)` (vetor unitário calculado a partir de `inclination` = −0.2 / `azimuth` = 0.55, estático). Uma referência útil para estimar a direção dos reflexos durante os testes dos packs.

O motor não inclui um ciclo dia/noite. `inclination` permanece estático; mundos que implementam um ciclo dinâmico atualizam esse valor na lógica do jogo. `bloxdSunDirection()` reflete cada atualização.

A iluminação direcional do terreno se limita a duas fontes criadas no início da cena. Sua **direção e intensidade permanecem constantes durante o dia e a noite**. Em outras palavras, o brilho do terreno não varia com o horário; a aparência diurna ou noturna depende apenas do skybox e de `bloxdSunDirection()`. Por isso, pacotes que escurecem o terreno à noite precisam estimar o horário a partir de `bloxdSunDirection()`, como na técnica `sunPresent` de [Projetando looks noturnos](../guides/night.md).

## R-A. Luz da lua

Adiciona iluminação difusa de Lambert em tom branco-azulado e um leve brilho especular apenas enquanto a lua está acima do horizonte. Nos mundos padrão, em que o sol permanece estático, `moonUp` é 0 e nada acontece. **O efeito de luz lunar só é ativado em mundos que implementam um ciclo dia/noite.**

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // A lua fica na direção oposta ao sol apenas quando o vetor solar não é zero.
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
