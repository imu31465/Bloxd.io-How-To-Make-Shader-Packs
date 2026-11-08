# एनचैंट प्रभाव

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (2026-11-08 को प्रोडक्शन और preprod में सत्यापित) · स्थिति: Analyzed (लाइव हेडर से पुनर्प्राप्त)

v5 ने एनचैंट पाइपलाइन को इनपुट और आउटपुट दोनों ओर खोल दिया है। इंजन का गणित बनाए रखते हुए एनचैंटेड आइटम और कवच की चमक नियंत्रित करने की रेसिपियाँ।

## इनपुट और आउटपुट

**इनपुट** (`BloxdSurfaceIn` / `BloxdLightIn` — केवल एनचैंटेड आइटम और कवच पर, अन्यथा सब 0):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**आउटपुट** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

इंजन इसे [`bloxdLitColour()`](../api/lighting.md) के भीतर मिलाता है — शेडिंग के ठीक बाद, विश्व प्रकाश से पहले। `bloxdDefaultSurface` इनपुट को बिना बदले पास कर देता है, इसलिए **डिफ़ॉल्ट रूप v4 के इंजन-आंतरिक व्यवहार से मेल खाता है**।

## डिफ़ॉल्ट को समझना

इनपुट `enchantColour.a` एक **एनिमेटेड** अल्फा है — इंजन चमक की स्वीप को एनिमेट करता है, इसलिए प्रति-फ्रैगमेंट `.a` पढ़ने से चलता हुआ पैटर्न मुफ़्त में मिल जाता है। `enchantTier` और `enchantSpeed` निर्माण से ही संगत हैं («faster at higher tiers»)।

अनएनचैंटेड फलक `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0` ले जाते हैं।

## रेसिपी 1: बिना-चमक यथार्थवाद (दो पंक्तियाँ)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## रेसिपी 2: टियर के अनुसार प्रबल चमक

`enchantTier` रंग पार्स किए बिना क्लासिक "टियर-स्केल्ड चमक" देता है:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## रेसिपी 3: चमक का रंग बदलना

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // निम्न टियर नीले, उच्च बैंगनी
        out.enchantColour = e;
    }
    return out;
}
```

## रेसिपी 4: enchantSpeed-संचालित स्वीप

`enchantSpeed` को कस्टम स्वीप के लिए फ़ेज़ में बदलें:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## रेसिपी 5: हर्ट फ़्लैश को बढ़ाना (overlayColour)

`overlayColour` (केवल खिलाड़ी/मॉब; हर्ट फ़्लैश आदि) `bloxdLitColour` में प्रकाश से पहले मिलता है:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

गैर-एंटिटी पर निर्दोष (`overlayColour` वहाँ 0 है)।

## कस्टम प्रकाश के साथ संयोजन

`bloxdLitColour()` प्रयोग करने से एनचैंट/ओवरले मिश्रण स्वतः बना रहता है:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## टिप्पणियाँ

- एनचैंट इनपुट **केवल एनचैंटेड आइटम और कवच पर आते हैं** — टेरेन, पानी और अनएनचैंटेड फलकों पर सब 0
- `enchantColour` आउटपुट बदलना `colour` को सीधे कभी नहीं छूता — मिश्रण `bloxdLitColour` / `bloxdDefaultLight` में होता है
- मॉडल पाइपलाइन के बाहर एनचैंट इनपुट सदा 0 होते हैं

## संबंधित

- [प्रकाश](../api/lighting.md) · [स्ट्रक्चर](../api/structures.md) · [मॉडल शेडर रेसिपियाँ](model-shaders.md)
