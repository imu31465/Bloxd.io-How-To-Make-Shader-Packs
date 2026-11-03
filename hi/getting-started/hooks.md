# शेडर हुक

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03 को प्रोडक्शन में सत्यापित) · स्थिति: Verified

एक पैक **9 हुक** प्लग कर सकता है: 3 रेंडर लक्ष्य (Terrain / Liquid / Model) × 3 पाइपलाइन चरण (Vertex / Surface / Light)। सभी वैकल्पिक हैं — अपरिभाषित छूटा हुक इंजन डिफ़ॉल्ट पर लौट जाता है।

## हुक

| हुक | चरण | क्या करता है |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | terrain का vertex एनिमेशन। **strict गेम में नहीं चल सकता** |
| `bloxdTerrainSurface` | terrain · surface | terrain का रंग, alpha, emission, enchant, overlay |
| `bloxdTerrainLight` | terrain · light | terrain का अंतिम रंग — फ़्रैगमेंट का आख़िरी चरण |
| `bloxdLiquidVertex` | liquid · vertex | पानी का vertex एनिमेशन। **strict गेमों के विरुद्ध गार्ड अनिवार्य** |
| `bloxdLiquidSurface` | liquid · surface | पानी का रंग, alpha, emission |
| `bloxdLiquidLight` | liquid · light | पानी का अंतिम रंग |
| `bloxdModelVertex` | model · vertex | ब्लॉक मॉडल / आइटम / एंटिटी का vertex एनिमेशन। **strict गेमों के विरुद्ध गार्ड अनिवार्य** |
| `bloxdModelSurface` | model · surface | मॉडल का रंग, alpha, emission, enchant, overlay |
| `bloxdModelLight` | model · light | मॉडल का अंतिम रंग |

हस्ताक्षर (प्रकार ठीक-ठीक मेल खाने चाहिए; पैरामीटर के नाम आपकी मर्ज़ी के):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* वही प्रकार लेते हैं
```

## रेंडर-लक्ष्य विभाजन

- **Terrain** — पानी और ब्लॉक मॉडल के अलावा हर ब्लॉक
- **Liquid** — पानी
- **Model** — ब्लॉक मॉडल (स्लैब, सीढ़ियाँ, क्रॉस्ड-प्लेन पौधे), हाथ में पकड़े/गिरे/फेंके गए आइटम, प्लेयर, मॉब, NPC, कवच, कॉस्मेटिक्स

**महत्वपूर्ण**: अगर पैक कोई Liquid हुक परिभाषित नहीं करता, तो **पानी पर कोई Terrain हुक भी नहीं चलता** (पानी केवल Liquid हुकों से ही संभाला जाता है)। यह pre-v4 व्यवहार से अलग है, जिसमें तरल terrain हुकों पर गिर जाता था।

## फ़ॉलबैक और कोड साझा करना

- अपरिभाषित हुक का मतलब है कि वह चरण इंजन डिफ़ॉल्ट इस्तेमाल करता है (वही व्यवहार जो `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight` का है)
- **हुकों के बीच कोड साझा करने के लिए** एक मॉड्यूल-स्तरीय फ़ंक्शन परिभाषित करें और दोनों ओर से उसे बुलाएँ:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## डिफ़ॉल्ट पैक (आधिकारिक 9-हुक टेम्पलेट)

शुरुआती टेम्पलेट में अब light हुक भी शामिल हैं। जैसा भेजा गया है वैसा ही 1,683 बाइट, शब्दशः:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

टेम्पलेट की टिप्पणियाँ ही डिज़ाइन-मार्गदर्शन हैं: बनाना शुरू करने के लिए रिटर्न वैल्यू बदलें; हुक मिटाने पर डिफ़ॉल्ट लौट आता है; strict गेम terrain को अपनी जगह पर रखते हैं; कोड फ़ंक्शनों के ज़रिए साझा करें।

## लेखन प्रथाएँ

- **आउटपुट स्ट्रक्चर कभी सीधे न बनाएँ** (`BloxdSurface(...)` सत्यापन में असफल होता है)। हमेशा `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` से शुरू करके फ़ील्ड बदलें। light हुक का पहला तर्क पहले से ही आउटपुट प्रकार का होता है, इसलिए `var out = s;` भी चलता है
- ही `var x: BloxdSurface;` (सिर्फ़ टाइप एनोटेशन) भी एक सत्यापन त्रुटि है
- हुक के पैरामीटर **रीड-ओनली** होते हैं। पहले कॉपी करें (`var sv = s;`)
- `bloxd` से शुरू होने वाले पहचानकर्ता इस्तेमाल नहीं कर सकते (केस-असंवेदनशील), केवल 9 हुक फ़ंक्शन नामों को छोड़कर
- कॉन्स्टैंट `const` से लिखें (`#define` कोई वैल्यू नहीं लेता)

हर हुक कौन-से फ़ील्ड पढ़ और लिख सकता है — इसके लिए [स्ट्रक्चर](../api/structures.md) देखें।
