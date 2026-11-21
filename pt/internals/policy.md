# Política de pacotes de shaders por jogo

> API alvo: 5 · Tipo: referência técnica
Esta página fixa o que `allow / strict` significa no nível de título. Somente títulos cuja definição de jogo carrega explicitamente `shaderPackPolicy: "allow"` rodam em modo completo (hooks de vértice, `discard`, `alpha` de terreno); títulos sem o ajuste (ou com qualquer valor diferente de allow) são estritos — `BLOXD_STRICT` fica definido e o código protegido por guardas é desativado automaticamente. O lado do pacote não pode escolher isso, então saber quais títulos rodam o quê é um pré-requisito para a distribuição.

- Acima de `shaderPackPolicy` existe um bloqueio de canal de distribuição (aproximadamente `canUseShaderPacks`): por portais externos (por exemplo, builds do Coolmath Games) o próprio sistema de pacotes de shaders pode ser desativado antes mesmo que `shaderPackPolicy` seja consultado. A análise allow/strict abaixo baseia-se no build web principal do bloxd.io.
- allow é declarado em 12 lugares: 8 literais diretos em definições de jogo e 4 variáveis base (`tb` / `kz` / `cb` / `Fb`); as variantes o herdam via spread (`{...tb,...}`). Atualmente não existem sobreposições por variante (nem um padrão pai-allow / filho-estrito).


## Títulos allow

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (13 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuais**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Os casos mais enganosos do lado estrito:

- **Superflat Creative (classic_creativeFlat) é estrito.** O nome contém "Creative", mas dentro da família classic somente o Creative normal (`classic_creative`) é allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. são todos estritos
- **Custom Games (customGames) é estrito.** Efeitos de hooks de vértice não disparam em jogos personalizados criados por usuários. Test Gym é a escolha segura para o trabalho de verificação
- Títulos importantes de PvP / servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) são todos estritos

Note que em títulos estritos o pacote em si continua carregado e compilado, e receitas do lado do fragmento, como surface / light, rodam como de costume. O que fica restringido: os hooks de vértice (`bloxdTerrainVertex` / `bloxdLiquidVertex`), o `discard` e o `alpha` de terreno (líquidos o têm sempre).


Antes de distribuir um pack, teste-o no jogo de destino e confirme que os hooks necessários funcionam nele.
