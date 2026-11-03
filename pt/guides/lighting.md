# Iluminação padrão do motor e margem para realismo



A iluminação padrão do motor é "só multiplicação" — não existem especular, fresnel, separação quente/frio nem ambiente hemisférico. O seguinte pode ser reconstruído:

| Função | Padrão | Reconstruível em pacotes? |
|---|---|---|
| Difuso (Lambert) | Só soma escalar de direcionais | ◎ Próprio com `bloxdSunDirection()` (fontes envoltas etc.) |
| Especular | Nenhum | ◎ Blinn-Phong (R9.2) |
| Fresnel | Nenhum | ◎ Aproximação de Schlick (R9.3) |
| Separação tocha quente / céu frio | Sem cor | ◎ (R9.1) |
| Ambiente hemisférico | Sem direção | ◎ Céu em cima / chão embaixo (R9.4) |
| Mapeamento de tons | Nenhum (só clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Só névoa (troca de cor) | ◎ Dessaturação com distância (R9.6) |
| Detalhe de superfície | Só resolução de textura | △ Micro-relevo procedural com hash (R9.8) |
| Ondas de vértice (água) | Nenhuma (plano) | ◎ Só allow (R7) |
| Normais de onda / brilho solar | Nenhumas | ◎ (R9.7) |
| Luar noturno | A cor do céu só escurece | △ A direção lunar está em `-bloxdSunDirection()`: pseudo looks (ambiente azul em R2 / dessaturação em R9.11) mais luar direcional (R-A, só ciclo dia/noite) |
| Sombras (oclusão de céu) | Só mistura suave via `mix(ambiente, céu, skyLight)` | ◎ Inversão do lift + corte por limiar + porta solar (R9.12). Sombra de árvores e sob telhados cai claramente, seguindo edições de blocos em tempo real |
