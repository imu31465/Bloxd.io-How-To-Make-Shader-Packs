# Receitas realistas



> Receitas físicas para "reconstruir o visual baunilha a partir dos materiais". Leia estas premissas primeiro:
>
> 1. **O hook light é chamado na etapa final do fragmento**. Sua cor devolvida vira a cor final como está. **Você deve reaplicar a névoa** (R9.10)  
> 2. **A iluminação padrão do motor é só multiplicação**. Especular / fresnel / separação quente-frio / ambiente hemisférico se constroem do zero  
> 3. `l.engineColour` é a cor terminada (já com névoa). Reconstruir de `s.colour` (albedo) é a abordagem completa  
> 4. Texturas são proibidas → todo detalhe deve ser **procedural** (hash/ruído) (R9.8)

## R9.1 Tochas quentes × céu frio

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermediário
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // refazer névoa
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // re-somar emission
}
    return out;
}
```

## R9.2 Especular solar (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // vetor médio
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

## R9.3 Fresnel de Schlick

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // tênue brilho de borda
}
    return out;
}
```

## R9.4 Ambiente hemisférico (céu em cima / rebote do chão embaixo)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // embaixo: rebote
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // em cima: luz do céu
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermediário
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // refazer névoa
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // re-somar emission
}
    return out;
}
```

## R9.5 ACES fílmico (aproximação de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposição
    return out;
}
```

## R9.6 Perspectiva aérea ("atmosfera" por dessaturação com distância)

> Ao contrário da névoa (troca de cor), sobrepor "dessaturação com distância" deixa vistas longes bem mais realistas.  
> Cuidado: reduza só a saturação — nunca toque a luminância.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // queda (~30% a 100blk / ~75% a 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // só cai saturação (luminância intacta)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

## R9.7 Normais de onda + brilho solar ("estrada do sol" na água)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // altura h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 Micro-relevo procedural (truque contra a proibição de texturas)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // coords locais do bloco
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 Escurecimento não linear de cavernas + proteção de lamparinas

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // levanta focos com lamparinas
        out.colour *= mix(keep, 1.0, sky * sky);     // escurecimento não linear (ao quadrado)
}
    return out;
}
```

## R9.10 Reaplicar névoa (obrigatório ao descartar engineColour)

> Por um piso como `min(l.fogAlpha, 0.75)` limita "não mais denso que isto"  
> (0.0 = fiel ao motor / 0.3–0.5 = distância mais clara).  
> Nota: a névoa do motor é linear só de horizonte (perto da distância de desenho); a bruma média deve ser construída pelo pacote.
> Ajustes reais de névoa (verificados em implementação): linear fixo / `fogStart` = distância de chunks / `fogEnd` = +1 chunk / efetivamente desativada a 100–101 chunks com névoa off / cor padrão RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // refazer névoa (0.15 = piso leve)
        col += s.emission * (1.0 - l.fogAlpha);            // emissão também com névoa
        out.colour = col;
}
    return out;
}
```

## R9.11 Grau cinema (sombras frias / altas quentes / dessaturação noturna)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // noite só quando a direção solar é zero; sem degradê de ocaso
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 Sombras projetadas — inversão do lift + corte por limiar (definitivo)

> **Revisão da premissa (seção 10)**: `l.skyLight` não é o valor de voxel cru (n/15) mas o valor após a "curva de lift" do motor  
> `y = 1-(1-x/(3-2x))³` (curva S que levanta áreas escuras).
>
> | Lugar | voxel cru | liftado (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | céu aberto | 1.00 | 1.00 | 1.00 |  
> | sob árvore (raio 2) | 0.87 | **0.97** | **0.86** ← quase intacto |  
> | raio 3 | 0.80 | **0.92** | 0.66 |  
> | raio 5 | 0.67 | 0.78 | 0.29 |
>
> **Esta é a causa demonstrada de "sombras não aprofundam com gamma"**. Mas a curva é monótona e invertível algebricamente:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Após restaurar valores crus, basta binarizar com corte por limiar (`smoothstep`).  
> A dispersão BFS do LightEngine é "1 bloco = -1", então o limiar `th = 1 - r/15` marca diretamente  
> "oclusão de raio r ou mais conta como sombra". Quebrar blocos move sombras na hora (LightEngine recalcula em tempo real).  
> Limitação: sombras usam como base "o céu para cima", então não giram com o sol (seção 15, "A verdade sobre as sombras").

```wgsl
// Inverte exatamente o lift do motor para restaurar o skyLight de voxel cru (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // sem cbrt em WGSL, use pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // dial de raio de sombra: th = 1 - r/15 (0.87 = raio 2+ é sombra)
const shSoft = 0.04;   // suavidade de borda (0.02 = duro / 0.08 = suave)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. restaura valores crus (pular isto jamais dá sombras)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. corte por limiar — separa limpo sol=1 / sombra=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // Lambert solar (recorre a l.directional quando não há sol)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // a essência da projeção: sol direto só chega onde o céu é visível
        let lit = sunL * sky;
        // lado sombra: azul céu, não preto + ambiente mínimo
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // luz de tocha atravessa sombras (blockLight também liftado: restaura junto)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // reaplica névoa (a parte do engineColour descartado)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // não esqueça emission (com névoa)
}
    return out;
}
```

> Guia de ajuste: **a área de sombra é só `shTh`** — `0.93` = raio 1.5+ / `0.87` = raio 2 / `0.80` = raio 3 / `0.67` = raio 5.  
> A dureza da borda é `shSoft` (0.02 = duro / 0.08 = suave). A escuridão do núcleo é o duplo ajuste de `0.09` (ambiente mínimo) e `0.16` (luz dispersa do céu).  
> Para alargar sombras ao entardecer, some `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (aproximação de sombras longas de tarde.  
> `sunDir` é `bloxdSunDirection() / length(bloxdSunDirection())`). Para sombras mais azuis suba o B de `vec3f(0.72, 0.82, 1.05)`.
>
