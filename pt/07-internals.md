[← Parte anterior](06-implementation.md)·[Voltar ao manual](README.md)·[Parte seguinte →](08-apiv2.md)

# Parte VII: Suplemento de interioridades

Especificações extra achadas por análise de implementação do motor. Tudo restaurado diretamente do JavaScript do build de produção atual.

## 24. Identidade do sol e da lua

A fonte de `bloxdSunDirection()` é um buffer de direção solar reescrito só quando muda o tipo de skybox — o critério não é "se o céu tem sol" mas **"se o skybox é tipo terra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (céu procedural) | Não zero (defeitos abaixo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Sempre (0,0,0)** |

**A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). A noite se julga por altura solar — há lua acima quando `bloxdSunDirection().y < 0` (sol sob o horizonte). Mas em mundos padrão o sol é estático e a lua também — só os mundos com ciclo dia/noite a veem mover-se.

A direção solar padrão ronda `(-0.56, 0.81, -0.18)` (vetor unitário de inclination = −0.2 / azimuth = 0.55, estático). Referência prática para predizer direções de brilho ao testar pacotes de distribuição.

Os ciclos dia/noite não estão integrados no motor — inclination é um número estático que os mundos com dia móvel atualizam lado jogo. `bloxdSunDirection()` segue cada atualização.

As luzes direcionais do terreno são só 2 lâmpadas criadas ao arrancar a cena, de **direção e intensidade fixas, sem mudança dia/noite**. Em curto: **nenhum fator de brilho do terreno depende do tempo. Os "looks" dia/noite vêm só do skybox e bloxdSunDirection()**, assim os pacotes que escurecem de noite devem estimar a faixa horária desde bloxdSunDirection() (a técnica `sunPresent` de §19).

### R-A. Luar direcional — moonDir = −bloxdSunDirection()

Soma Lambert branco-azulado e especular fraca só enquanto a lua está acima. `moonUp` é 0 em mundos de sol estático padrão: ali nada acontece — **luar que só dispara em mundos com ciclo dia/noite, logo seguro**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
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
    #endif
    return out;
}
```

## 25. Interioridades da névoa

O cômputo de névoa é sempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), com `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de névoa; só D = 0 é especial com fogEnd = 5). **A banda de gradiente é de só 32 blocos**, e `l.fogVisibility` é menos "bruma por distância" que **distância normalizada à borda do mundo carregado**. Varia por jogador com a distância de carga: efeitos por distância devem calcular `distance(l.position, bloxdEyePosition())` eles mesmos (receita R-B).

Cor de névoa padrão `rgb(183, 191, 195)` (cinza azul pálido). Criadores de mundos a mudam via `fogColourOverride` (hex). Com modo névoa 0 (NONE), **fogColour chega preto**. A forma padrão `mix(l.fogColour, col, l.fogVisibility)` é segura pois a cor de névoa não se usa a fogVisibility 1.

Ajustar `showFog` para false empurra a névoa a 3200–3328 blocos, desativando de fato (`fogVisibility ≈ 1` segue vindo).

### R-B. Banda de borda de carga — fogVisibility como "borda do mundo"

Esfria em silêncio só a banda de 32 blocos da borda de carga para disfarçar o fim do mundo (ou enfatizá-la como efeito). Sem distância autocalculada: segue auto os ajustes de distância de carga do jogador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margem à borda), 0 = a ponto de sair da borda
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Interioridades de blockLight / heldLight

Ao decodificar `aPackedLightLevels`, o motor põe a cada canal um **piso de 35% do canal RGB mais brilhante**. Ex. uma "luz vermelha pura" eleva-se a (1.00, 0.35, 0) em vértices antes de interpolação e lift. O laranja de tocha parecendo "rosa esbranquiçado mais que vermelho" vem daqui — ajuste a saturação de receitas de tocha quente (R9.1) contra este default.

A luz de mão (`heldLight`) tem alcance segundo o canal mais brilhante (máx 15 blocos) com pré-processo `dist^0.75`, o mesmo piso 35%, e `l.heldLight` é o valor **pré**-boost ambiental. Objetos personalizados podem fixar `spotlightRange` e ângulo de cone — um modo "feixe enquanto segura" cujo cone segue a câmera. Pacotes não podem saber a direção do feixe.

Blocos personalizados podem levar `skyLightEmission` (0–15), que **injeta no próprio canal skyLight, à parte do BFS de blockLight**. Pacotes estilo R9.12 que julgam sol/sombra por limiar skyLight podem falhar em mundos com skyLight elevado por luzes artificiais. Pacotes de distribuição julgam mais robusto combinado com blockLight.

## 27. Detalhes de pipeline

- **Os hooks surface correm "antes" de alphaTest**: `out.alpha` alimenta o teste de descarte diretamente. Materiais cutout (grama, folhas) permitem efeitos de dissolução tipo dither (receita R-C). Em líquidos (mistura) `out.alpha` é a transparência real (receita R-D). Sem efeito em terreno opaco normal — não confundir
- **Conteúdo de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. O lado cena ata ao ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5) — nunca programe defeitos fixos
- **`bloxdTime()` é realmente `performance.now()`**: o uptime do navegador enrolado a 1 hora. Sem relação com dia/noite do jogo nem tempo de mundo decorrido. Para animar sincronizado a um relógio de jogo, estime a hora desde o azimute `bloxdSunDirection()` em mundos com ciclo dia/noite
- Os finos damieiros em bordas de chunk ao carregar são o fundido de chunk por dither Bayer 4×4 em espaço de tela do motor, não bugs do pacote
- **`mod` é palavra reservada**: rejeitado com `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escreva restos com o operador `%`

### R-C. Dissolução por dither Bayer — out.alpha controla discard

Reproduz a **mesma tabela Bayer 4×4** que o motor usa em fundidos de chunk, dissolvendo cutouts desde blocos baixos. discard dispara em materiais alphaTest (grama, folhas); em líquidos é transparência de mistura.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod é reservado: use o operador %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // dissolve-se desde blocos baixos; maior dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fundido de água cercana à câmera — o alpha líquido despeja a vista

O `out.alpha` do hook líquido alimenta a mistura diretamente. Despeja só a superfície sob a câmera para assegurar a vista ao mergulhar ou com câmera sobre a água.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 blocos de transparente total a normal
    #endif
    return out;
}
```

## 28. O que muda os valores visíveis do pacote — lista de provas

O mesmo pacote renderiza distinto segundo **mundo e ajustes de jogador**. Revise ao menos estes 3 ambientes antes de distribuir:

1. **Mundo normal** (skybox default, sem overrides) — bloxdSunDirection() presente, cores padrão
2. **Mundo com skybox espacial** — bloxdSunDirection() = 0. O look do ramo `sunPresent`
3. **Mundo personalizado com `visionMinLightColour` / `skyLightColourOverride`** — escuros elevados e cores

Fontes principais de variação: `lightingOverride` (iluminação forçada) / `skyLightColourOverride`, `ambientLightColourOverride` (trocas hex) / `visionMinLightColour` (piso "cor mais escura visível" sobre sky e ambient; Night Vision o usa — os pacotes "caverna às escuras" não escurecem o previsto) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presença de bloxdSunDirection()). `uSkyLightColour` padrão = (1,1,1) branco, `uAmbientLightColour` padrão = (0.25,0.25,0.30). `l.ambient` lado cena = ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5). `l.fogVisibility` segue os ajustes de névoa/distância de chunks do jogador.

## 29. Meios de depuração

- Parâmetro URL `?renderer=lite` — força o renderizador Lite (`?renderer=webgl2` / `babylon` também valem)
- Parâmetro URL `?vconsole` — consola em tela (VConsole). Útil em verificação móvel real
- A consola mostra `noa-engine v0.33.0` e `Renderer: lite from <fonte>` — revise-os primeiro para não diagnosticar mal a via de render
- O renderizador WebGPU bloqueia-se "forçado ON" com pacote aplicado. O ajuste "Disable Block Texture Atlas" também se bloqueia (o atlas fica ON), e em ambientes sem WebGPU o pacote nem aplica. Base para escrever "precisa navegador WebGPU" em páginas de distribuição
- A revalidação runtime por partida (`checkCompilation`) compila materiais de terreno reais em WebGPU do navegador (mais estrita que a validação estática de ajustes). Os pacotes que falham aqui se excluem desse jogo

## 30. Modos de aplicação por jogo (`shaderPackPolicy`)

Aqui fica definido o que significam `allow / strict` no nível de título (cf. §7). Só os títulos cuja definição de jogo carrega explicitamente `shaderPackPolicy: "allow"` rodam em modo completo (hooks vertex, `discard`, `alpha` de terreno); títulos sem valor (ou com valor diferente de allow) são estritos: `BLOXD_STRICT` fica definido e o código amparado por guardas fica desativado automaticamente. O lado do pacote não escolhe isto, então saber que títulos rodam o quê é pré-requisito da distribuição.

- Build de referência: `szby6g.main.94a7596c.js` (deploy em produção em 2026-10-17). Enumerando estaticamente as 111 definições de jogo: **26 entradas allow (12 títulos) / 85 entradas estritas**.
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
