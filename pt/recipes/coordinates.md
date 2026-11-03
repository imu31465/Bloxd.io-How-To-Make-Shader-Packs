# Coordenadas

> API alvo: 5 · Build alvo: `ab90qa` (2026-11-03, produção) · Estado: Verified (portado à API atual — re-verificação no dispositivo recomendada)
## Coordenadas de mundo

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## Coordenadas de bloco

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## Xadrez (por bloco)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 ou 1
out.colour *= mix(0.96, 1.04, checker);
```

## Pseudoaleatório por bloco (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usos: variação de cor de grama, mosqueado de pedra etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## Vetor de vista e luz de borda (rim)

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## Ângulo de vista (look fresnel — para líquidos)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de frente / 0 rasante
let fresnel = pow(1.0 - facing, 3.0);
```
