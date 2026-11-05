# Fazendo a água parecer natural

> API alvo: 5 · Build alvo: `bny9u` (2026-11-05, produção) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)
Esta API não pode amostrar cor de cena, então isto é **estilização pseudo com mistura de cor ao estilo fresnel e realces de sol, não reflexo/refração reais** (o cálculo de profundidade usa o `bloxdOpaqueBehind()` exclusivo de líquidos — a receita de absorção por espessura está mais abaixo nesta página). A amostra abaixo mantém a cor base, mistura um pouco rumo a uma cor tipo céu em ângulos rasantes de visão e adiciona um pequeno brilho apenas quando existe sol.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

Pontos de ajuste:

- Água branca/lavada: baixe o `0.38` em `fresnel * 0.38` e o brilho `0.55`.
- Água escura demais: misture um pouco mais de `fakeSkyReflection`. Em excesso fica com cara de plástico.
- Linhas ou listras regulares na água: baixe as frequências de onda e a força do brilho. Este código não faz deslocamento de vértices da malha.
- Reflexos reais da paisagem: as entradas desta API não têm cor de tela, então misturar cores jamais se torna reflexo real (a profundidade é exclusiva de líquidos — veja [Funções: bloxdOpaqueBehind](../api/functions.md)).

Esta receita **substitui** um `bloxdLiquidLight` existente. Não a cole junto da função de onda homônima de R9.7 nem de outros hooks homônimos.


## Realidade submarina com pacotes de shaders


Os looks submarinos consistem em 3 camadas:

| Camada | Conteúdo | Operável pelos pacotes? |
|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido na posição da câmera, desenhado na frente de tudo. O ajuste de jogo `cameraTint` prevalece se definido | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes continuam funcionando debaixo d'água / o véu não pode ser removido / não se pode ramificar sobre o estado submarino (fogStart / fogEnd / fogColour não mudam debaixo d'água, então fogAlpha tampouco consegue detectá-lo).
