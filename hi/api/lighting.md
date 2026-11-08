# लाइटिंग

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` · स्थिति: Analyzed (लाइव हेडर से अक्षरशः पुनर्स्थापित)

v5 ने लाइटिंग API प्रकाशित किया। जो काम इंजन आंतरिक रूप से करता था (`litColour` बनाना), वह अब पैकों से कॉल किया जा सकता है। यह पेज लाइटिंग के इनपुट, फ़ंक्शन और प्रोसेसिंग क्रम को एक पूरे तंत्र के रूप में कवर करता है।

## पूरी पाइपलाइन

रंगों की पूरी श्रृंखला, जैसी कि डिफ़ॉल्ट लाइट-स्टेज इम्प्लीमेंटेशन (`bloxdDefaultLight`) उसे दिखाती है:

```
surface.colour
    │  overlayColour के साथ मिलाया जाता है (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  bloxdShading(light) से गुणा — सामग्री और कोण की प्रतिक्रिया
    ▼
shaded
    │  enchantColour के साथ मिलाया जाता है (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  bloxdWorldLight(light) से गुणा — वर्ल्ड लाइट (ब्लॉक/स्काई/हेल्ड में सबसे चमकीला)
    ▼
lit = bloxdLitColour(surface, light)   ← "उत्सर्जन और कोहरे से पहले" वाला रंग
    │  + surface.emission               ← उत्सर्जन लाइटिंग के बाद जोड़ा जाता है
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (अंतिम रंग)
```

`bloxdLitColour()` का क्रम (हेडर सारांश: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. `overlayColour` लगाएँ
2. `bloxdShading()` से शेड करें
3. `enchantColour` लगाएँ
4. `bloxdWorldLight()` से वर्ल्ड लाइट लगाएँ

उत्सर्जन और कोहरे का क्रम: **उत्सर्जन लाइटिंग के बाद और कोहरे से पहले जोड़ा जाता है**, और कोहरा उत्सर्जन को भी डुबो देता है (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`)।

## फ़ंक्शन

### bloxdLit() — गेट

```wgsl
fn bloxdLit() -> bool
```

क्या ब्लॉक और स्काई लाइटिंग चालू है। **बंद होने पर गारंटी**:

| फ़ील्ड | बंद होने पर मान |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (सफ़ेद) |

v4 का `#ifdef BLOXD_LIGHTING` हटा दिया गया है। इसे `if (!bloxdLit()) { return bloxdDefaultLight(...); }` से बदलें।

### bloxdShading() — सामग्री और कोण की प्रतिक्रिया

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- `directional` (जोड़ा हुआ Lambert) को `diffuse` (सामग्री की RGB प्रतिक्रिया) से गुणा करता है, `emissive` (सामग्री की चमक) और `ambient` (RGB एम्बिएंट) जोड़ता है, 0–1 पर क्लैंप करता है
- **नए v5 इनपुट `diffuse` / `emissive`** से आप केवल Lambert पद बदल सकते हैं, इंजन की सामग्री-प्रतिक्रिया को बनाए रखते हुए

### bloxdWorldLight() — वर्ल्ड का प्रकाश

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- तीनों चैनलों (ब्लॉक / स्काई / हेल्ड) को `ambientLightColour` को फ़्लोर बनाकर आकार देता है, फिर उनमें **सबसे चमकीले** को चुनता है
- `skyLight` स्काई-लाइट की मात्रा के अनुसार `ambientLightColour` से `skyLightColour` की ओर इंटरपोलेट करता है

### bloxdLitColour() — इंजन रेसिपी

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — कोहरा

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = कोई कोहरा नहीं, 1 = केवल fogColour** (v4 के `fogVisibility` से उलटा)
- `fogColour` गेम के कोहरे का RGB है; **गेम में कोहरा न होने पर `vec3f(0.0)`**

### bloxdDefaultLight() — पूरा डिफ़ॉल्ट

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## इनपुट फ़ील्ड (BloxdLightIn)

| फ़ील्ड | टाइप | अर्थ | टिप्पणी |
|---|---|---|---|
| `litColour` | `vec3f` | रोशन और एनचैंट किया हुआ RGB (उत्सर्जन और कोहरे से पहले) | परिणामी मान है, स्रोत नहीं |
| `directional` | `f32` | डायरेक्शनल लाइटों से जोड़ा गया Lambert | डायरेक्शनल लाइटें न हों तो 0 |
| `diffuse` | `vec3f` | डायरेक्शनल प्रकाश के प्रति सामग्री की RGB प्रतिक्रिया | `bloxdShading()` को सामग्री-प्रतिक्रिया फिर से बनाने देता है |
| `emissive` | `vec3f` | सामग्री की RGB चमक (डायरेक्शनल में जुड़ती है) | |
| `ambient` | `vec3f` | RGB एम्बिएंट (डायरेक्शनल में जुड़ता है) | |
| `blockLight` | `vec3f` | RGB ब्लॉक लाइट | `!bloxdLit()` पर 0 |
| `skyLight` | `f32` | स्काई लाइट | `!bloxdLit()` पर 1 |
| `ambientLightColour` | `vec3f` | न्यूनतम RGB प्रकाश (फ़्लोर) | `!bloxdLit()` पर 1 |
| `skyLightColour` | `vec3f` | skyLight का RGB रंग | `!bloxdLit()` पर 1 |
| `heldLight` | `vec3f` | RGB हेल्ड लाइट | `!bloxdLit()` पर या हाथ में कुछ न होने पर 0 |
| `fogColour` | `vec3f` | गेम के कोहरे का RGB | कोहरा न होने पर 0 |
| `fogAlpha` | `f32` | 0 = कोई कोहरा नहीं, 1 = केवल fogColour | v4 के `fogVisibility` से उलटा |

## लाइट-लेवल का फ़िज़िक्स (पृष्ठभूमि, छोड़ा जा सकता है)

- **`blockLight` / `skyLight` / `heldLight` 0–1 पर मैप होकर आते हैं**: 0–15 के लेवल एक ईज़-आउट वक्र से गुज़रते हैं (जैसे `6 → 0.45`, `12 → 0.92`)। तीनों में `ambientLightColour` शामिल नहीं होता
- **लिफ़्ट वक्र**: `skyLight` असल में "क्या इस स्थिति से आसमान दिखता है" है — वॉक्सेल ऑक्लूज़न डेटा, यानी एक शैडो मानचित्र। थ्रेशोल्ड-आधारित धूप/छाया अलग करने के लिए व्युत्क्रम ट्रांसफ़ॉर्म की ज़रूरत पड़ सकती है ([रियलिज़्म गाइड](../guides/realism.md) देखें)
- **कोहरे की आंतरिक कार्यप्रणाली**: लीनियर मोड में `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (0..1 पर क्लैंप), व्यू स्पेस में प्रति वर्टेक्स गणना होती है। मौजूदा बिल्ड केवल लीनियर है (विवरण [इंजन इंटरनल्स: फ़ॉग इंटरनल्स](../internals/fog-internals.md) में)

## रेसिपी

### कस्टम शेडिंग + इंजन की वर्ल्ड लाइट

जिसे v4 के लेखक `litColour` को स्केल करके सन्निकट बनाते थे, वह अब यथार्थ रूप में लिखा जा सकता है:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // पहले से जोड़ा हुआ Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### इंजन की वर्ल्ड लाइट रखें, केवल उत्सर्जन बढ़ाएँ

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### रात का नीला शिफ़्ट (skyLight-संचालित)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## संबंधित

- [फ़ंक्शन](functions.md) · [गाइड: लाइटिंग](../guides/lighting.md) · [इंजन इंटरनल्स: लाइटिंग इंटरनल्स](../internals/lighting-internals.md)
