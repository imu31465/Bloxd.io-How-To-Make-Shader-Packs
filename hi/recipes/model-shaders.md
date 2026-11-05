# मॉडल शेडर

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bny9u` (2026-11-05 को प्रोडक्शन में सत्यापित) · स्थिति: Analyzed (v5 हेडर विनिर्देश के अनुसार लिखा गया)

v5 के मॉडल हुक और नए फ़्लैग से बनी रेसिपियाँ — **v5 से पहले असंभव रहे "मैं किस चीज़ को देख रहा हूँ" वाले चयनों** के लिए। बुनियादी बातें: [मॉडल और टेक्सचर](../guides/models.md)।

## पकड़े-आइटम की चमक

वही जो v1 से फ़र्स्ट-पर्सन शेडर लेखक चाहते रहे, दो पंक्तियों में:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## दुनिया को हाथ से अलग करना

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## चमकते ब्लेड-सिरे (localPosition)

`localPosition` मॉडल के साथ घूमता है — विश्व-स्पेस के अंदाज़े के बिना "मैं मॉडल पर कहाँ पर हूँ":

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

टिप्पणी: `localPosition` की वास्तविक सीमाएँ मॉडल-दर-मॉडल बदलती हैं — डिवाइस पर सत्यापित करें और बचाव के लिए `clamp` लगाएँ।

## गिराए हुए आइटम हाइलाइट करना

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## प्लेयर स्किन पर ठंडा रिम (lifeform)

अधिकांश मॉडल `textureId: 0` (स्किन) प्रयोग करते हैं; `surface.colour` में पहले से स्किन × रंजन शामिल है:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## हवा में डोलते पौधे (केवल allow)

पौधे (`flags.flat`) मॉडल की तरह बनाए जाते हैं — शीर्ष हुक से डुलाएँ:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(वनस्पति भी `flags.vegetation` है: `flat` = "क्रॉस-प्लेन के रूप में बनाया गया", `vegetation` = "पौधा है" — घास और फूल दोनों।)

## केवल एटलस-टेक्सचर वाले मॉडल फलक

ब्लॉक-मॉडल फलक (स्लैब, सीढ़ियाँ…) एटलस `textureId` ले जाते हैं; `textureId != 0u` से चुनें:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` फलक (स्किन) सफ़ेद सैंपल होते हैं — कोई त्रुटि नहीं ([मॉडल-स्वामित्व टेक्सचर](../api/texture-api.md#मॉडल-स्वामित्व-टेक्सचर-textureid-0))।

## कवच बनाम बाकी सब

`flags.lifeform` में कवच और कॉस्मेटिक्स शामिल हैं ([Flags](../api/flags.md))। इससे बारीक-दर-बारीक कोई इनपुट नहीं है; व्यावहारिक सन्निकटन के रूप में `localPosition` (स्थापन) या `overlayColour` की उपस्थिति को जोड़ें।

## टेरेन के साथ साझा करना

पूरे ब्लॉक और ब्लॉक-मॉडल पर एकसमान ग्रेडिंग:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

साझा-फ़ंक्शन पैटर्न वही है जो डिफ़ॉल्ट पैक टेम्पलेट स्वयं सुझाता है ([hooks](../getting-started/hooks.md#फ़ॉलबैक-और-कोड-साझा-करना))।

## संबंधित

- [मॉडल और टेक्सचर](../guides/models.md) · [एनचैंट प्रभाव](enchant-effects.md) · [Flags](../api/flags.md) · [स्ट्रक्चर](../api/structures.md)
