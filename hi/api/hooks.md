# शेडर हुक

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` · स्थिति: Verified

पैक **9 हुक** परिभाषित कर सकते हैं — 3 रेंडर लक्ष्य (प्रोग्राम) × 3 पाइपलाइन चरण, सभी वैकल्पिक (अपरिभाषित का मतलब इंजन डिफ़ॉल्ट)।

## 9-हुक तुलना

| हुक | प्रोग्राम | चरण | तर्क | रिटर्न | चलने की शर्त |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | केवल allow वेरिएंट (**strict में इसे परिभाषित करना ही एक त्रुटि है**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | हमेशा |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | हमेशा |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | केवल allow |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | हमेशा |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | हमेशा |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | केवल allow |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | हमेशा |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | हमेशा |

## हर प्रोग्राम क्या ड्रॉ करता है

| प्रोग्राम | ड्रॉ करता है | Liquid हुक न होने पर पानी |
|---|---|---|
| **Terrain** | पानी और ब्लॉक मॉडल के अलावा हर ब्लॉक | — |
| **Liquid** | पानी | **पानी पर कोई Terrain हुक भी नहीं चलता** (पानी अपना डिफ़ॉल्ट रूप रखता है) |
| **Model** | ब्लॉक मॉडल (स्लैब, सीढ़ियाँ, पौधे, फ़सलें, मकड़जाल), हाथ में पकड़े/गिरे/फेंके गए आइटम, प्लेयर, मॉब, NPC, कवच, कॉस्मेटिक्स | — |

## चरणों की भूमिकाएँ

- **Vertex** — vertex की जगहें हिलाना (घास का दुलना, लहरें)। vertex एनिमेशन strict गेम में पूरा पैक बंद कर देता है, इसलिए `#ifndef BLOXD_STRICT` अनिवार्य है
- **Surface** — सामग्री का आउटपुट: `colour` / `alpha` (सशर्त) / `emission` / `enchantColour` / `overlayColour`
- **Light** — अंतिम रंग; surface के आउटपुट के साथ `BloxdLightIn` लेता है। इसकी रिटर्न वैल्यू ही स्क्रीन पर दिखने वाला रंग है

## हस्ताक्षर

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* वही तर्क व रिटर्न प्रकार लेते हैं
```

## स्पेशल-फ़ंक्शन कॉल प्रतिबंध

इंजन का वैलिडेटर तय करता है कि कौन-से हुक कुछ फ़ंक्शनों तक पहुँच सकते हैं (उल्लंघन पर विशेष "reaches" डायग्नॉस्टिक्स के साथ असफलता मिलती है):

| फ़ंक्शन | कहाँ से बुलाने-योग्य | गार्ड |
|---|---|---|
| `bloxdTexel` | केवल surface / light हुक | — |
| `bloxdTextureSize` | केवल surface / light हुक | — |
| `bloxdOpaqueBehind` | surface / light हुक (liquid वेरिएंट में अर्थपूर्ण) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` अब प्रलेखित हेडर में नहीं है, पर इंजन इसे अब भी इंजेक्ट करता और स्वीकार करता है — देखें [फ़ंक्शन्स: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--अनडॉक्यूमेंटेड-पर-अब-भी-इंजेक्ट-होती-है)। यह इकलौता स्पेशल फ़ंक्शन था जो vertex हुकों से बुलाया जा सकता था; नए कोड में "यह कौन-सा ब्लॉक है" के लिए `flags` को तरजीह दें।

## फ़ॉलबैक और साझा करना

- अपरिभाषित हुक → वह चरण इंजन डिफ़ॉल्ट जैसा आचरण करता है (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **हुकों के बीच प्रोसेसिंग साझा करें** एक मॉड्यूल-स्तरीय फ़ंक्शन के ज़रिए, जिसे दोनों ओर से बुलाया जाए:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## संबंधित

- आधिकारिक 9-हुक टेम्पलेट → [शुरुआत करें: शेडर हुक](../getting-started/hooks.md)
- हर स्ट्रक्चर का हर फ़ील्ड → [स्ट्रक्चर](structures.md)
- हुक बुलाने की आंतरिकी → [इंजन-आंतरिक](../internals/hook-invocation.md)
