# प्रीप्रोसेसर

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bny9u` · स्थिति: Analyzed (लाइव वैलिडेटर से पुनर्स्थापित)

कंडीशनल कंपाइलेशन केवल `#define NAME` (बिना मान) / `#ifdef` / `#ifndef` / `#else` / `#endif` को समर्थन देता है। `#` पंक्ति की शुरुआत में लगता है (फ़ंक्शन के भीतर होना भी ठीक है)। फ़्लैग-नाम मिलान केस-असंवेदनशील है; ग़लत `#ifdef` नाम लिखने पर त्रुटि संदेश आधिकारिक सेट की सूची दिखाता है।

## परिभाषित मैक्रो (3)

| मैक्रो | कहाँ परिभाषित | सामान्य उपयोग |
|---|---|---|
| `BLOXD_STRICT` | strict-गेम वेरिएंट (strict.terrain / strict.liquid / strict.model) | पूरे वर्टेक्स हुकों और `discard` के चारों ओर `#ifndef BLOXD_STRICT` |
| `BLOXD_ALPHA` | वे वेरिएंट जहाँ `BloxdSurface.alpha` मौजूद है — सभी लिक्विड + नॉन-strict टेरेन/मॉडल | alpha छूने वाले कोड को रैप करें |
| `BLOXD_SCENE_DEPTH` | सभी लिक्विड वेरिएंट | `bloxdOpaqueBehind()` कॉल को रैप करें |

## मैक्रो × वेरिएंट मैट्रिक्स

| वेरिएंट | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

टेरेन / लिक्विड / मॉडल के अंतर **अलग प्रोग्राम हैं, मैक्रो नहीं** — `#ifdef BLOXD_TERRAIN` मौजूद नहीं है।

## हटाए गए मैक्रो

- **`BLOXD_LIGHTING`** — v5 में हटा दिया गया। लाइटिंग की स्थिति [`bloxdLit()`](lighting.md#bloxdlit--गेट) के लिए रनटाइम का प्रश्न है, कंपाइल ब्रांच नहीं। इसका उपयोग करने पर सत्यापन इसके साथ विफल हो जाता है:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

v4 माइग्रेशन पैटर्न:

```wgsl
// v4 (v5 पर सत्यापन में विफल)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (माइग्रेट किया हुआ)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... लाइटिंग-सक्रिय प्रोसेसिंग
}
```

## उदाहरण

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // टेरेन में alpha केवल allow में होता है
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // वर्टेक्स हुकों को हमेशा यह गार्ड चाहिए
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## मैक्रो स्ट्रक्ट को आकार देते हैं

- `BloxdSurface.alpha` केवल `#ifdef BLOXD_ALPHA` के भीतर मौजूद है
- `bloxdOpaqueBehind()` केवल `#ifdef BLOXD_SCENE_DEPTH` के भीतर कॉल किया जा सकता है

देखें [स्ट्रक्चर](structures.md#सशर्त-फ़ील्ड--मैक्रो)।

## संबंधित

- [शुरुआत: वेरिएंट](../getting-started/variants.md) · [इंजन इंटरनल्स: शेडर सत्यापन](../internals/shader-validation.md)
