# Duas escolas de implementação



**Escola A: retoques aditivos (de defaultLight)** — usa `engineColour` (cor terminada) como base e soma brilho quente ou rim. Fácil e seguro, mas o modelo de iluminação segue o padrão.

**Escola B: reiluminação total (de s.colour)** — descarta `l.engineColour` e reconstrói a iluminação de `s.colour` (albedo) e materiais LightIn crus. O caminho real ao realismo. Quatro regras:

1. **Reaplique a névoa**: o hook light roda pós-névoa; aplique `mix(l.fogColour, col, (1.0 - l.fogAlpha))` você mesmo (R9.10). Com névoa densa, ponha piso com `min(l.fogAlpha, 0.70)`. E ao contrário: misturar mais cor de névoa em pacotes baseados em engineColour produz névoa branca dupla
2. **Reserva unlit**: passe para `defaultLight` fora de `#ifdef BLOXD_LIGHTING`
3. **Proteja funções compartilhadas inteiras**: envolva em `#ifdef BLOXD_LIGHTING` como funções completas as funções compartilhadas que tomam `BloxdLightIn` (proteger só chamadas não basta)
4. **Sem direção solar**: se `bloxdSunDirection()` é zero, não compute especular direcional. `l.directional` é um escalar de quantidade de luz, não um vetor de direção: não restaura a direção do brilho. Troque para ambiente fraco sem direção se preciso. A direção lunar está disponível via `-bloxdSunDirection()` (só se move em mundos com ciclo dia/noite. [Parte VII](../internals/) R-A)
