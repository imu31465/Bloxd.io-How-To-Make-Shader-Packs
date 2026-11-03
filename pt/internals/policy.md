# Modos de aplicação por jogo (`shaderPackPolicy`)



Aqui fica definido o que significam `allow / strict` no nível de título (cf. §7). Só os títulos cuja definição de jogo carrega explicitamente `shaderPackPolicy: "allow"` rodam em modo completo (hooks vertex, `discard`, `alpha` de terreno); títulos sem valor (ou com valor diferente de allow) são estritos: `BLOXD_STRICT` fica definido e o código amparado por guardas fica desativado automaticamente. O lado do pacote não escolhe isto, então saber que títulos rodam o quê é pré-requisito da distribuição.

- Build de referência: `szby6g.main.94a7596c.js` (deploy em produção em 2026-10-17). Enumerando estaticamente as 111 definições de jogo: **26 entradas allow (12 títulos) / 85 entradas estritas**. Os mesmos 12 literais allow, nos mesmos 12 títulos, foram reconfirmados sem alteração no bundle de produção da v3 (`3ymzdd`, 2026-10-20) — a lista abaixo se mantém literalmente na v3.
- Acima de `shaderPackPolicy` existe um bloqueio de canal de distribuição (basicamente `canUseShaderPacks`): via portais externos (por exemplo, builds do Coolmath Games) o próprio sistema de pacotes de shaders pode ser desativado antes mesmo que `shaderPackPolicy` seja consultado. A análise allow/strict abaixo diz respeito à build web principal do bloxd.io.
- allow é declarado em 12 lugares: 8 literais diretos em definições de jogo e 4 variáveis base (`tb` / `kz` / `cb` / `Fb`); as variantes herdam por spread (`{...tb,...}`). Hoje não existe sobreescrita por variante (nem o padrão inverso pai-allow / filho-estrito).

Os 12 títulos allow (26 entradas no total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuais**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

No lado estrito, os casos mais enganosos:

- **Superflat Creative (classic_creativeFlat) é estrito.** O nome contém "Creative", mas na família classic só o Creative normal (`classic_creative`) é allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. são todos estritos
- **Custom Games (customGames) é estrito.** Efeitos de hooks vertex não disparam em jogos personalizados criados pelo usuário. Para o trabalho de verificação, Test Gym é a escolha segura
- Títulos principais PvP / de servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) são todos estritos

Note que nos títulos estritos o pacote continua sendo carregado e compilado, e as receitas do lado fragment como surface / light funcionam normalmente. O que fica restrito: os hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` e a `alpha` de terreno (em líquidos existe sempre).

Esta lista reflete a análise estática do build indicado; atualizações do motor podem mudar a divisão allow/strict. Reconfirme ao saírem versões novas.
