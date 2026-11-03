# निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)



## विश्व निर्देशांक

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## ब्लॉक निर्देशांक (आधिकारिक रेसिपी — शीर्ष टिप्पणी उद्गम)

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## शतरंजी (ब्लॉक इकाई)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 या 1
out.colour *= mix(0.96, 1.04, checker);
```

## ब्लॉक इकाई छद्म यादृच्छिक (हैश)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// उपयोग: घास रंग भिन्नता, पत्थर रंग धब्बा आदि
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## दृष्टि सदिश व रिमप्रकाश

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## दृष्टि कोण (फ्रेनेल भाव — तरल हेतु)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // ठीक ऊपर से 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```
