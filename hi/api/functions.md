# फ़ंक्शन

> लक्ष्य API: 5 · प्रकार: तकनीकी संदर्भ

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
- **रिटर्न वैल्यू**: वर्ल्ड निर्देशांकों में सूर्य की ओर इकाई वेक्टर; **वर्ल्ड में सूर्य न होने पर शून्य वेक्टर**।
- **महत्वपूर्ण तथ्य**:
  - यह फ़ंक्शन शून्य से अलग वेक्टर लौटाए, तो चंद्रमा की दिशा `-bloxdSunDirection()` होती है। शून्य लौटने पर चंद्रमा की वास्तविक दिशा ज्ञात नहीं की जा सकती।
  - **शून्य वेक्टर को `normalize` में न भेजें**। पहले `dot(d, d) < 1e-8` जाँचें और ज़रूरत पड़ने पर एक निश्चित वैकल्पिक दिशा लें।
  - इंजन अपने-आप दिन-रात का चक्र नहीं चलाता। डिफ़ॉल्ट Earth sky में सूर्य `(−0.56, 0.81, −0.18)` के पास (उन्नतांश ≈ 54°) स्थिर रहता है। कोई world `inclination` को अपडेट करके अपना दिन-रात चक्र लागू कर सकता है; इससे सूर्य और चंद्रमा की दिशाएँ बदलती हैं।
- **उपयोग**: रंग-तापमान और प्रकाश-दिशा, सूर्य की उपलब्धता की जाँच, और परिवेशी चाँदनी प्रभाव।

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

### `bloxdFragmentBlockPosition`

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

## छाया फ़ंक्शन

ये तीनों फ़ंक्शन `bloxdFragmentBlockPosition` की तरह हर पैक के **कम्पाइल किए गए मॉड्यूल में इंजेक्ट** किए जाते हैं। ये वैलिडेटर की फ़ंक्शन तालिका में दर्ज हैं, लेकिन पढ़े जा सकने वाले हेडर टेक्स्ट का हिस्सा नहीं हैं।

### bloxdShadow

```wgsl
fn bloxdShadow() -> f32
```

- **वापस देता है**: इस फ्रैग्मेंट तक पहुँचती सूर्य- या चंद्र-रोशनी — **छाया में 0, रोशनी में 1** — *API v5 में नया*
- कौन डालता है: **ब्लॉक, खिलाड़ी, मॉब और आइटम** (प्रथम-पुरुष हाथ का आइटम जानबूझकर छोड़ा गया)
- व्यवहार (वैलिडेटर विवरण से शब्दशः): सूर्य/चंद्र डूबने या फलक मुड़ने पर 0 की ओर फेड; `flags.emissive` फलकों पर **1**; रोशनी `bloxdShadowDirection()` के अनुदिश चलती है, इसलिए सूर्यहीन आकाश के नीचे भी छायाएँ बनती हैं
- **कहाँ से बुलाया जा सकता है**: surface / light हुक
- रेसिपी: `let sun = mix(shadowColour, litColour, bloxdShadow());` — [छायाएँ](../guides/shadows.md) देखें

### bloxdAirShadow

```wgsl
fn bloxdAirShadow(t: f32) -> f32
```

- **वापस देता है**: `bloxdShadow()` जैसा, पर **कैमरा (t = 0) और इस फ्रैग्मेंट (t = 1) के बीच के बिंदु** पर — *API v5 में नया* — प्रकाश-स्तंभों के लिए
- केवल ब्लॉक डालते हैं (खिलाड़ी/मॉब नहीं), पूरे ब्लॉक तक धुँधली; `t` 0–1 पर क्लैम्प
- रेसिपी: दृष्टि-किरण के अनुदिश कई `t` सैंपल कर संचित करें — [छायाएँ](../guides/shadows.md)

### bloxdShadowDirection

अवधारणा में छाया फ़ंक्शनों के साथ है, पर पठनीय हेडर में रहता है — [फ़्रेम फ़ंक्शन](#bloxdshadowdirection) देखें।


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
