# Koordinaten

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

## Weltkoordinaten

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## Blockkoordinaten

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## Schachbrett (pro Block)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 oder 1
out.colour *= mix(0.96, 1.04, checker);
```

## Block-Pseudozufall (Hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// Nutzen: Grasfarbvariation, Steinmarmorierung etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## Sichtvektor und Rim-Light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## Sichtwinkel (Fresnel-Hausmittel — für Flüssigkeiten)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 frontal / 0 streifend
let fresnel = pow(1.0 - facing, 3.0);
```
