# Dicas de depuração

> API alvo: 5 · Build alvo: `v98qt8` (2026-11-08, produção e preprod) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)

- Cavernas claras demais → falta a curva não linear de `skyLight` (receita de cavernas R2 / R9.9)
- Dias estourados → baixe a exposição pré-ACES
- Noites escuras demais para enxergar → garanta um ambiente mínimo (o `skyLightColour` noturno é quase preto por premissa)
- Distância com bruma demais → baixe os coeficientes de perspectiva aérea
- Arredores de tocha todo laranja → baixe a proporção da mistura quente (mantenha algo de luz crua tingida)
- Blocos quase todo brancos → o total da saída do hook light supera 1.0 (sem clamp a jusante). Termine com `clamp(col, vec3f(0.0), vec3f(1.0))`
- Branco sem adições → inversão un-fog por divisão de névoa. Abandone o un-fog; reconstrua a partir de `s.colour` e aplique o `mix` de névoa uma única vez ao final
- Blocos emissivos não brilham → falta a re-soma de emission em receitas de reconstrução. Some `+ s.emission * (1.0 - l.fogAlpha)`
- Looks noturnos errados só nas faces iluminadas → não escureça apenas as cores de sombra; atenue toda a cor terminada do motor (`engineColour`) à noite. Para manter lamparinas locais, enfraqueça a atenuação com `blockLight` / `heldLight` ([Projetando looks noturnos](night.md))
- A sombra não aprofunda com `pow(skyLight, γ)` → `l.skyLight` é pós-lift (seção 10). Mude para a inversão + corte por limiar de R9.12
- Ajuste de área/densidade de sombra → veja o guia de ajuste de R9.12 (área = limiar `shTh` / borda = `shSoft` / escuridão do núcleo = deslocamento em dois pontos do ambiente mínimo e da dispersão do céu)
