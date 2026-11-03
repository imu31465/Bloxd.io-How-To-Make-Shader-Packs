# Política de pacotes de shaders por jogo

> API alvo: 5 · Build alvo: `ab90qa` (2026-11-03, produção) · Estado: Analyzed (análise de JavaScript do bundle de produção)
Esta página fixa o que `allow / strict` significa no nível de título. Somente títulos cuja definição de jogo carrega explicitamente `shaderPackPolicy: "allow"` rodam em modo completo (hooks de vértice, `discard`, `alpha` de terreno); títulos sem o ajuste (ou com qualquer valor diferente de allow) são estritos — `BLOXD_STRICT` fica definido e o código protegido por guardas é desativado automaticamente. O lado do pacote não pode escolher isso, então saber quais títulos rodam o quê é um pré-requisito para a distribuição.

- Build de referência: `szby6g.main.94a7596c.js` (deploy de produção em 2026-10-17). A enumeração estática das 111 definições de jogo dá **26 entradas allow (12 títulos) / 85 entradas estritas**. Os mesmos 12 literais allow nos mesmos 12 títulos foram reconfirmados sem alteração no bundle de produção da v3 (`3ymzdd`, 2026-10-20) e de novo no bundle da v4 (`cnty9`, 2026-10-27) — a lista abaixo se transporta literalmente para a v3 e a v4.
- Acima de `shaderPackPolicy` existe um bloqueio de canal de distribuição (aproximadamente `canUseShaderPacks`): por portais externos (por exemplo, builds do Coolmath Games) o próprio sistema de pacotes de shaders pode ser desativado antes mesmo que `shaderPackPolicy` seja consultado. A análise allow/strict abaixo baseia-se no build web principal do bloxd.io.
- allow é declarado em 12 lugares: 8 literais diretos em definições de jogo e 4 variáveis base (`tb` / `kz` / `cb` / `Fb`); as variantes o herdam via spread (`{...tb,...}`). Atualmente não existem sobreposições por variante (nem um padrão pai-allow / filho-estrito).

Os 12 títulos allow (26 entradas no total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuais**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Os casos mais enganosos do lado estrito:

- **Superflat Creative (classic_creativeFlat) é estrito.** O nome contém "Creative", mas dentro da família classic somente o Creative normal (`classic_creative`) é allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. são todos estritos
- **Custom Games (customGames) é estrito.** Efeitos de hooks de vértice não disparam em jogos personalizados criados por usuários. Test Gym é a escolha segura para o trabalho de verificação
- Títulos importantes de PvP / servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) são todos estritos

Note que em títulos estritos o pacote em si continua carregado e compilado, e receitas do lado do fragmento, como surface / light, rodam como de costume. O que fica restringido: os hooks de vértice (`bloxdTerrainVertex` / `bloxdLiquidVertex`), o `discard` e o `alpha` de terreno (líquidos o têm sempre).

Esta lista reflete a análise estática do build acima; atualizações do motor podem mudar a divisão allow/strict. Verifique novamente quando uma nova versão for lançada.
