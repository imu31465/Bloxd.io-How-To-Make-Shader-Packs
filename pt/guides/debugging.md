# Dicas de depuração



- Cavernas claras demais → falta curva não linear de `skyLight` (receita de cavernas R2 / R9.9)
- Dias estourados → baixe a exposição pré-ACES
- Noites escuras demais → assegure ambiente mínimo (o `skyLightColour` noturno é quase preto por premissa)
- Distância com bruma demais → baixe coeficientes aéreos
- Tudo laranja em torno de tochas → baixe a proporção quente (conserve algo de luz crua tingida)
- Blocos quase todo brancos → o total de saída do hook light supera 1.0 (sem clamp águas abaixo). Termine com `clamp(col, vec3f(0.0), vec3f(1.0))`
- Branco sem somas → inversão un-fog por divisão com fogVisibility. Tire un-fog; reconstrua desde `s.colour` e `mix` de névoa uma só vez ao final
- Blocos emissivos não brilham → falta re-soma de emission em receitas de reconstrução. Some `+ s.emission * (1.0 - l.fogAlpha)`
- De noite só restam faces iluminadas → não escureça só sombras; atenue toda a cor terminada (`engineColour`) de noite. Para conservar lamparinas locais, atenue menos com `blockLight` / `heldLight` ([Parte VI](../guides/), seção 19)
- Sombra não aprofunda com `pow(skyLight, γ)` → `l.skyLight` é pós-curva (seção 10). Mude para inversão + limiar de R9.12
- Ajustar área/densidade de sombra → guia de ajuste de R9.12 (área = limiar `shTh` / borda = `shSoft` / escuridão do núcleo = duplo ajuste de ambiente mínimo e dispersão do céu)
