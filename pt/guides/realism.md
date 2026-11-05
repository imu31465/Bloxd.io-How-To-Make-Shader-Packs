# Realismo: duas escolas

> API alvo: 5 · Build alvo: `bny9u` (2026-11-05, produção) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)

**Escola A: retoques aditivos (a partir de defaultLight)** — usa `engineColour` (cor terminada) como base e soma brilho quente ou rim. Fácil e seguro, mas o modelo de iluminação continua sendo o padrão.

**Escola B: reiluminação total (a partir de s.colour)** — descarta `l.engineColour` e reconstrói a iluminação a partir de `s.colour` (albedo) e dos materiais crus de LightIn. O caminho real para o realismo. Quatro regras:

1. **Reaplique a névoa**: o hook light roda pós-névoa; aplique `mix(l.fogColour, col, (1.0 - l.fogAlpha))` você mesmo (R9.10). Com névoa densa demais, ponha um piso com `min(l.fogAlpha, 0.70)`. Inversamente, misturar mais cor de névoa sobre pacotes baseados em engineColour gera névoa dupla rumo a uma distância branca
2. **Fallback unlit**: passe para `defaultLight` fora de `#ifdef BLOXD_LIGHTING`
3. **Proteja funções compartilhadas inteiras**: envolva em `#ifdef BLOXD_LIGHTING`, como funções completas, as funções compartilhadas que tomam `BloxdLightIn` (proteger só os pontos de chamada não basta)
4. **Quando não há direção do sol**: se `bloxdSunDirection()` for zero, não calcule especular direcional. `l.directional` é um escalar de quantidade de luz, não um vetor de direção, então não consegue restaurar a direção do brilho. Troque para um ambiente fraco sem direção conforme necessário. A direção da lua está disponível via `-bloxdSunDirection()` (só se move em mundos com ciclo dia/noite — [O sol e a lua](../internals/sun-and-moon.md))
