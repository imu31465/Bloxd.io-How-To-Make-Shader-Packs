# फ़ंक्शन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` · स्थिति: Analyzed (लाइव हेडर से अक्षरशः पुनर्स्थापित)

हेडर का हर फ़ंक्शन। टेक्सचर API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) `bloxdOpaqueBehind` के साथ [टेक्सचर API](texture-api.md) में कवर किया गया है।

## फ़्रेम फ़ंक्शन (पूरे फ़्रेम के लिए एक ही मान)

हेडर टिप्पणी: *"These functions return the same value for the entire frame."* ये `bloxdPackInputs` यूनिफ़ॉर्म पढ़ते हैं, इसलिए इन्हें वर्टेक्स हुकों और मॉड्यूल-स्कोप फ़ंक्शनों से भी कॉल किया जा सकता है।

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **रिटर्न वैल्यू**: कैमरे की रेंडर स्थिति
- **कहाँ से कॉल किया जा सकता है**: सभी 9 हुक + मॉड्यूल स्कोप
- **उपयोग**: व्यू वेक्टर (`normalize(l.position - bloxdEyePosition())`), रिम लाइट, दूरियाँ

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **रिटर्न वैल्यू**: पूर्णांक ब्लॉक ऑफ़सेट; **रेंडर स्थिति + यह ऑफ़सेट = वर्ल्ड स्थिति**
- खिलाड़ी के आगे बढ़ने पर बदलता रहता है (रेंडर स्थितियों को 0,0,0 के पास रखता है)
- `bloxdWorldPosition()` इसे आंतरिक रूप से उपयोग करता है

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **रिटर्न वैल्यू**: वर्ल्ड अभिविन्यास में सूर्य की ओर इकाई वेक्टर; **सूर्य न होने पर शून्य वेक्टर**
- **तथ्य**:
  - **चंद्रमा हमेशा `-bloxdSunDirection()` पर होता है** (इंजन उसे सूर्य के ठीक विपरीत रखता है)
  - **शून्य वेक्टर को कभी `normalize` में न भेजें** — `dot(d, d) < 1e-8` से गार्ड करें और एक स्थिर दिशा पर फ़ॉलबैक करें
  - मौजूदा बिल्ड में कोई दिन-रात चक्र नहीं है; एक सत्र के दौरान सूर्य, चंद्रमा और तारे हिलते नहीं हैं (केवल ओपैसिटी टॉगल होती है)। डिफ़ॉल्ट अर्थ स्काई में सूर्य `(−0.56, 0.81, −0.18)` के पास बैठता है (उन्नतांश ≈ 54°)
- **उपयोग**: रंग-तापमान, प्रकाश की दिशा, सन गेटिंग, छद्म चंद्र-प्रकाश

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **रिटर्न वैल्यू**: पेज लोड होने के बाद से बीते हुए सेकंड (कोई wrap नहीं — f32 पहले 4.5 घंटों तक सब-मिलीसेकंड परिशुद्धता बनाए रखता है)
- **उपयोग**: एनीमेशन; `bloxdSeconds() % period` से आवर्ती टाइमर
- **टिप्पणी**: v2 के `bloxdTime()` (जो 3600s पर wrap हो जाता था) के विपरीत, यह wrap नहीं होता

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **रिटर्न वैल्यू**: क्या ब्लॉक और स्काई लाइटिंग सक्रिय है
- **v5 में नया**: v4 की `#ifdef BLOXD_LIGHTING` कंपाइल-टाइम ब्रांच की जगह रनटाइम जाँच
- **बंद होने पर गारंटी** (हेडर टिप्पणी): `blockLight` और `heldLight` 0 हो जाते हैं; `skyLight` और लाइट के रंग (`ambientLightColour` / `skyLightColour`) 1 हो जाते हैं
- **उपयोग**: लाइटिंग-निर्भर कोड को गेट करें:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... लाइटिंग-सक्रिय प्रोसेसिंग
    return out;
}
```

`BLOXD_LIGHTING` का उपयोग करने पर मिलता है *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## कोऑर्डिनेट रूपांतरण

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **रिटर्न वैल्यू**: `position + vec3f(bloxdRenderOffset())`
- **टिप्पणी**: f32 परिशुद्धता की सीमाओं के कारण दूर की कोऑर्डिनेट अशुद्ध हो सकती हैं (हेडर: *"with possible f32 inaccuracy"*)

### bloxdFragmentBlockPosition — अनडॉक्यूमेंटेड, पर अब भी इंजेक्ट होती है

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

यह फ़ंक्शन **अब डॉक्यूमेंटेड हेडर का हिस्सा नहीं है** (v4 के हेडर में यह थी), लेकिन इंजन इसे अब भी स्वीकार करता और परिभाषित करता है:

- **वैलिडेटर**: लाइव सिग्नेचर टेबल में अब भी सूचीबद्ध है, इसलिए कॉल हर हुक में नाम सत्यापन पास कर लेते हैं (वर्टेक्स हुकों सहित)
- **रनटाइम**: कोड जेनरेटर टेरेन/लिक्विड मॉड्यूल और दोनों मॉडल प्रोग्रामों में इसकी परिभाषा अब भी इंजेक्ट करता है — टेरेन/लिक्विड `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()` उपयोग करते हैं; मॉडल पाइपलाइन 1/64-ब्लॉक ऑफ़सेट उपयोग करती हैं और रखे हुए ब्लॉक मॉडलों के लिए मॉडल की सेल पर स्नैप करती हैं
- **सावधानी**: अनडॉक्यूमेंटेड इंटरनल होने के नाते यह आने वाले किसी वर्शन में बिना सूचना गायब हो सकती है — सतत स्थितियों के लिए `bloxdWorldPosition()` और "यह कौन सा ब्लॉक है" के लिए `flags` पसंद करें (हेडर से इसके हटाए जाने के लिए [वर्शन हिस्ट्री: v5](../history/v5.md) देखें)

v4 के लिए लिखे गए पैक जो इसे कॉल करते हैं वे चलते रहेंगे; नए पैक इसे अपनाने की कोशिश न करें।

## डिफ़ॉल्ट फ़ंक्शन (इंजन का व्यवहार)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// क्रियान्वयन: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

`colour` को पार कर देता है, `enchantColour` / `overlayColour` को बिना बदलाव पार करता है, `emission` शून्य कर देता है (और `BLOXD_ALPHA` वेरिएंट में `alpha` पार करता है)। **आउटपुट स्ट्रक्ट केवल इसी फ़ंक्शन के ज़रिए बनाए जा सकते हैं।**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// क्रियान्वयन:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

शाब्दिक अर्थ: "इंजन की रेसिपी लगाओ, फिर उत्सर्जन-जोड़े गए परिणाम पर कोहरा चढ़ाओ"।

## लाइटिंग रेसिपी फ़ंक्शन

इंजन की अपनी लाइटिंग रेसिपी, कॉल करने योग्य WGSL के रूप में डॉक्यूमेंट की गई — चरणों को अलग-अलग जोड़ें या ओवरराइड करें। व्याख्या और फ़्लो डायग्राम: [लाइटिंग](lighting.md)।

| फ़ंक्शन | सिग्नेचर | भूमिका |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | फ़ेस की सामग्री और कोण उसे कितना रोशन करते हैं (Lambert × diffuse + emissive + ambient, 0–1 पर क्लैंप) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | यहाँ वर्ल्ड का प्रकाश (ब्लॉक/स्काई/हेल्ड में सबसे चमकीला, `ambientLightColour` से फ़्लोर्ड) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | सरफ़ेस का रंग, वैसे ही रोशन जैसे इंजन करता है (उत्सर्जन और कोहरे से पहले) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | इस फ़्रैगमेंट का कोहरा लगाता है (`mix(colour, fogColour, fogAlpha)`) |

## विशेष फ़ंक्शन

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **रिटर्न वैल्यू**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **कहाँ से कॉल किया जा सकता है**: केवल सरफ़ेस / लाइट हुक (डेप्थ टेक्सचर केवल FRAGMENT चरण का है)
- **गार्ड**: `#ifdef BLOXD_SCENE_DEPTH` (लिक्विड वेरिएंट में परिभाषित)
- **अर्थ**: इस फ़्रैगमेंट के पीछे का ओपेक फ़ेस (पानी के भीतर से दिखता टेरेन); स्काई के लिए `hit == false`
- **v2 से नाम बदला गया**: `found` → `hit`
- **गहरा विवेचन**: [वर्शन हिस्ट्री: v3](../history/v3.md) और [इंजन इंटरनल्स](../internals/rendering-pipeline.md)

## संबंधित

- [लाइटिंग](lighting.md) · [टेक्सचर API](texture-api.md) · [पैक फ़ॉर्मैट](pack-format.md)
