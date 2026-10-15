# Bloxd.io शेडर पैक बनाना (पूर्ण गाइड)

Bloxd.io शेडर पैक (केवल WebGPU रेंडरर) बनाने और वितरित करने की स्व-पर्याप्त गाइड।
`apiVersion: 1` के विनिर्देश पर आधारित। रेसिपी संग्रह और API संदर्भ सहित: इस एक फ़ाइल से शून्य से वितरण तक जा सकते हैं।

> यह अनौपचारिक गाइड है और डेवलपर्स के आधिकारिक मत का प्रतिनिधित्व नहीं करती। API बिना सूचना बदला जा सकता है।  
> अंतिम समीक्षा: 2026-10-15 (फ़ॉग प्रयोग क्रम, वास्तविक फ़ॉग सेटिंग व जलांत रेंडर रचना रेंडरर कार्यान्वयन से मिलान कर अद्यतित)। चूंकि कोई सार्वजनिक आधिकारिक WGSL API संदर्भ नहीं मिला, API विवरण और रेसिपी लोडिंग स्क्रीन व इन-गेम कंपाइल से सत्यापित करते रहें।  
> शेडर पैक सुविधा स्वयं गेम UI से लोड होने वाली आधिकारिक सुविधा है, और पैक शुद्ध WGSL हैं  
> (JS निष्पादन/नेटवर्क नहीं), इसलिए सामान्य कोड से कुछ खतरनाक नहीं होता।  
> यह गाइड AI सहायता से बनाई गई है; सटीकता की गारंटी नहीं। वास्तविक इन-गेम व्यवहार से सत्यापित करें।

## विषय-सूची

- [भाग I: पैक बनाना](#भाग-i-पैक-बनाना)
- [भाग II: API संदर्भ](#भाग-ii-api-संदर्भ)
- [भाग III: रेसिपी संग्रह](#भाग-iii-रेसिपी-संग्रह)
- [भाग IV: यथार्थवाद गाइड](#भाग-iv-यथार्थवाद-गाइड)
- [भाग V: समस्या-निवारण व नोट्स](#भाग-v-समस्या-निवारण-व-नोट्स)
- [भाग VI: महत्वपूर्ण कार्यान्वयन नोट्स](#भाग-vi-महत्वपूर्ण-कार्यान्वयन-नोट्स)
- [भाग VII: आंतरिक पूरक](#भाग-vii-आंतरिक-पूरक)

---

# भाग I: पैक बनाना

## 1. अवलोकन और पूर्वापेक्षाएँ

- शेडर पैक **केवल WebGPU रेंडरर** के लिए हैं। पैक इंस्टॉल रहने तक सेटिंग्स में WebGPU रेंडरर ज़बरन चालू रहता है
- पैक **WGSL के प्रतिबंधित सबसेट** में लिखे जाते हैं। वे केवल **टेरेन (terrain) और तरल (liquid)** के रूप को प्रभावित करते हैं
- जो कर सकते हैं: रंग, पारदर्शिता और उत्सर्जन बदलना; प्रकाश पुनर्निर्माण; प्रक्षेपण-शैली छायाएँ (R9.12); वर्टेक्स एनिमेशन (केवल कुछ खेलों में)
- जो नहीं कर सकते: टेक्सचर जोड़ना/सैंपल करना, पोस्ट-प्रोसेसिंग (ब्लूम आदि), सूर्य के साथ घूमने वाली पिक्सेल-सटीक छायाएँ (शैडो मैप) व वास्तविक परावर्तन (SSR), आकाश व एंटिटी प्रभावित करना
- जो कर सकते हैं (पर अक्सर छूट जाता है): **`skyLight` (वोक्सेल आकाश अवरोध) से प्रक्षेपण-शैली छायाएँ** — पेड़ों व छतों के नीचे स्पष्ट अंधेरा कर सकते हैं (R9.12)। ब्लॉक तोड़ने पर LightEngine तुरंत पुनर्गणना करता है, छायाएँ रीयल-टाइम साथ चलती हैं
- **अधिकांश खेल strict मोड** में चलते हैं (वर्टेक्स एनिमेशन नहीं, `discard` नहीं)। सामान्य वितरण वाले पैक strict में चलने लायक बनाएँ

## 2. त्वरित शुरुआत

1. फ़ोल्डर बनाएँ, उसमें `pack.json` और `.wgsl` फ़ाइलें रखें
2. गेम सेटिंग्स → Shader Pack से zip या फ़ोल्डर लोड करें
3. त्रुटियाँ सुधारें और पुनः लोड करें (भाग V देखें)
4. समर्थित खेलों में परीक्षण करें
5. पूर्ण होने पर zip करके वितरित करें

## 3. पैक संरचना

- **वितरण रूप**: एकल `.zip`, या फ़ोल्डर (फ़ोल्डर लोडिंग केवल डेस्कटॉप ब्राउज़र)
- **सामग्री**: एक `pack.json` (पैक के शीर्ष स्तर पर; केस असंवेदनशील) + 1–256 `.wgsl` फ़ाइलें
- कई `.wgsl` जोड़कर एक मॉड्यूल माना जाता है, इसलिए विभाजन व उप-निर्देशिका स्वतंत्र। नामों पर बंधन नहीं। गैर-`.wgsl` फ़ाइलें (README आदि) अनदेखी होती हैं
- ज़िप युक्ति: यदि zip में सब कुछ एक साझा रूट फ़ोल्डर के नीचे है, वह उपसर्ग स्वतः हट जाता है (macOS "संपीड़ित करें" वाले zip वैसे ही चलते हैं)। पर रूट स्तर पर फालतू फ़ाइलें शीर्ष-स्तर पहचान तोड़ देती हैं; सबसे सुरक्षित है फ़ोल्डर के अंदर जाकर `pack.json` व `.wgsl` सीधे निर्दिष्ट करके दबाना (सत्यापित करें कि `pack.json` ZIP रूट पर आए)

| मद | सीमा |
|---|---|
| zip आकार / प्रविष्टि संख्या | 32MB / 1024 |
| pack.json आकार | 64KB, UTF-8 |
| .wgsl कुल आकार | 256KB, UTF-8 |
| zip प्रारूप | zip64, विभाजित व एन्क्रिप्टेड अस्वीकृत |

## 4. pack.json

```json
{
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| फ़ील्ड | आवश्यक | विवरण |
|---|---|---|
| `apiVersion` | आवश्यक | ठीक-ठीक `1` से मेल खाना चाहिए |
| `name` | आवश्यक | खाली नहीं। सेटिंग्स UI में दिखता है |
| `author` | वैकल्पिक | छोड़ा जा सकता है। गैर-स्ट्रिंग मान (संख्या आदि) त्रुटि हैं |

अन्य फ़ील्ड अनदेखे होते हैं।

## 5. न्यूनतम टेम्पलेट

केवल `pack.json` (अध्याय 4) और इस `pack.wgsl` से चलने वाला पैक:

```wgsl
// हल्के गर्म रंग का न्यूनतम पैक
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

पालन योग्य नियम:

- आउटपुट संरचनाएँ **कभी सीधे न बनाएँ** (`bloxd_Surface(...)` त्रुटि है)। हमेशा `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` से शुरू करके फ़ील्ड बदलें। अपवाद: light हुक प्रथम प्राचल (`s: bloxd_Surface`) निर्गम समरूप अतः `var out = s;` से आरंभ भी योग्य
- हुक पैरामीटर **केवल-पठन** हैं। बदलने के लिए पहले कॉपी करें, जैसे `var sv = s;`
- अपने पहचानकर्ताओं में `bloxd_` उपसर्ग प्रयोग न करें (6 हुक नामों को छोड़कर)। परिभाषित केवल 6 हुक नाम कर सकते
- अनारंभिक `var x: bloxd_Surface;` (केवल प्रकार टिप्पणी) भी त्रुटि है
- स्थिरांक `const` से लिखें (`#define` में मान नहीं लिख सकते)

## 6. छह हुक

सभी वैकल्पिक। हस्ताक्षर प्रकारों में ठीक-ठीक मिलने चाहिए (पैरामीटर नाम स्वतंत्र)।

| हुक | भूमिका |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | टेरेन वर्टेक्स एनिमेशन। **strict में अनुपलब्ध** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | टेरेन रंग, पारदर्शिता, उत्सर्जन। `s.colour` = टेक्सचर × वर्टेक्स रंग |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | टेरेन अंतिम रंग। फ्रैगमेंट के **अंतिम चरण** में बुलाया जाता है, वापसी मान ज्यों का त्यों अंतिम रंग बनता है |
| `fn bloxd_liquid_vertex / _surface / _light` (सम रूप) | तरल संस्करण। `alpha` तरल पारदर्शिता के रूप में काम करता है |

फॉलबैक नियम:

- तरल हुक अपरिभाषित हो तो **उसी नाम का टेरेन हुक प्रयुक्त** होता है (विपरीत नहीं)। केवल surface लिखने से तरल पर भी वही प्रभाव लगता है
- light हुक अपरिभाषित हो तो डिफ़ॉल्ट व्यवहार (`engineColour + emission × fogFactor`)
- `engineColour` त्यागकर आधार रंग से पुनर्निर्माण करें तो स्वयं फ़ॉग दोबारा लगाएँ: `mix(l.fogColour, col, l.fogFactor)`। emission जोड़ते समय पहले `fogFactor` से गुणा करें

## 7. आठ वेरिएंट और गार्ड

कोड एक ही लिखते हैं, पर `{strict, allow} × {प्रकाश चालू, प्रकाश बंद} × {टेरेन, तरल}` के **सभी 8 संयोजनों** में कंपाइल होना चाहिए।
शर्त शाखाओं में केवल `#define` (केवल ध्वज, मान नहीं) / `#ifdef` / `#ifndef` / `#else` / `#endif` उपलब्ध हैं। `#` पंक्ति के आरंभ में आना चाहिए (फ़ंक्शन के अंदर भी ठीक)।

| गार्ड | अर्थ | उपयोग |
|---|---|---|
| `#ifndef BLOXD_STRICT` | केवल strict के बाहर (allow) | पूरे vertex हुक व `discard` को लपेटें |
| `#ifdef BLOXD_LIGHTING` | केवल प्रकाश चालू पर | `blockLight`, `skyLight`, `ambientLightColour` आदि छूने वाले कोड को लपेटें। **साझा सहायक फ़ंक्शन (मॉड्यूल-स्कोप fn) पूरे फ़ंक्शन सहित लपेटें** (केवल कॉल-स्थल पर्याप्त नहीं) |
| `#ifdef BLOXD_ALPHA` | `alpha` फ़ील्ड विद्यमान पर (तरल में हमेशा, टेरेन में केवल allow) | `alpha` छूने वाले कोड को लपेटें |

## 8. उपलब्ध भाषा सुविधाएँ और निषेध

उपलब्ध:

- WGSL अंतर्निहित फ़ंक्शन (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` आदि)
- स्वयं के `fn` / `struct` / `const` / `alias` / `var<private>`, फ़ंक्शन के अंदर `let` व नियंत्रण प्रवाह (if/for/while/switch आदि)
- अवकलज (`dpdx` / `dpdy` / `fwidth`) केवल surface/light हुक (फ्रैगमेंट चरण)। vertex में नहीं
- `const` सरणियाँ (जैसे पैलेट LUT), पॉइंटर (`ptr<function, T>`), आव्यूह (`mat3x3f` आदि)
- ध्वज परिभाषा `#define नाम` + `#ifdef` शर्त शाखा

निषेध और सावधानी:

- **टेक्सचर नहीं**: `texture_*` / `sampler` प्रकार अनुपयोगी। बनावट हैश शोर आदि प्रक्रियात्मक गणना से बनाएँ
- **`discard` strict में निषिद्ध** (`#ifndef BLOXD_STRICT` से लपेटें)
- `@विशेषण` / `enable` / `requires` / `override` निषिद्ध। `enable f16;` लिखा नहीं जा सकता, **f16 प्रकार व्यावहारिक निषिद्ध**
- `@builtin` विशेषण भी निषिद्ध, `fragCoord` (स्क्रीन निर्देशांक) व `vertex_index` पढ़े नहीं जा सकते
- **मॉड्यूल-स्कोप `let` प्रयोग न करें** (`const` या `var` प्रयोग करें)
- `atomic` अनुपयोगी
- निर्देशांक noa-स्थानीय हैं। विश्व निर्देशांक हेतु `originOffset` जोड़ें। ब्लॉक निर्देशांक = `vec3i(floor(position - normal * 0.5)) + originOffset`

## 9. सत्यापन, परीक्षण व वितरण

लोड होने पर गेम पक्ष में इस क्रम से जाँच होती है:

1. लोडर सीमा जाँच (अध्याय 3 की सीमाएँ)
2. स्थैतिक कंपाइल (सभी 8 वेरिएंट)
3. ब्राउज़र WebGPU द्वारा वास्तविक कंपाइल सत्यापन (स्थैतिक सत्यापन टाइप जाँच में अपूर्ण है, इसलिए यहाँ गिरने वाला कोड है। अध्याय 8 के जाल से बचें)

क्रम:

1. सेटिंग → Shader Pack से zip / फ़ोल्डर पढ़ें
2. स्थिति जाँचें। 「Ready to use」 हो तो सफलता। 「Saved, but it won't run until you fix these errors...」 हो तो त्रुटि सूची (file:पंक्ति + वेरिएंट सहित) सुधारकर पुनः पढ़ें
3. पढ़ने के बाद पृष्ठ ताज़ा करके सक्रिय करें
4. पहले ढीले खेलों में जाँचें, फिर strict खेलों (अधिकांश यही) में जाँचें। वर्टेक्स एनिमेशन वाले केवल allow खेलों में काम करते हैं
5. पूर्ण होने पर `pack.json` शीर्षस्थ रखकर zip में वितरित करें (अध्याय 3 की सीमाओं के भीतर)

# भाग II: API संदर्भ

## 10. इंजन शीर्षक (पैक कोड के आगे स्वतः जुड़ने वाला कोड)

नीचे कोड इंजन पैक कोड के आगे स्वतः डालता है (पैक पुनः घोषित नहीं कर सकते)। `#ifdef` में लिपटे भाग वेरिएंट अनुसार बदलते हैं।

```wgsl
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

मुख्य बिंदु:

- `time` हर 3600 सेकंड लपेटता है, बीता समय है। खेल की दिन-रात घड़ी से समन्वय की गारंटी नहीं।
- `sunDirection` सूर्य रहते समय इकाई वेक्टर है; सूर्यहीन आकाश में शून्य। **चंद्रमा सदा `-sunDirection` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। पर डिफ़ॉल्ट दुनियाओं में सूर्य स्थिर, चंद्रमा भी स्थिर — गतिशील चंद्रमा केवल दिन-रात चक्र दुनियाओं में मायने रखता है (भाग VII, अनुभाग 24 देखें)
- ※टिप्पणी: पहले "शून्य पर चंद्र दिशा पुनःप्रयोग असंभव" लिखा था। दिशा स्वयं `-sunDirection` से उपलब्ध है, पर वितरण पैक शून्य आधार मानकर `sunPresent` शाखा प्रयोग करें (नीला परिवेश छद्म हेतु R2, दिशात्मक चांदनी हेतु भाग VII R-A देखें)
- `emission` प्रकाश गणना के बाद जुड़ता है, **`fogFactor` से क्षीण होकर** (defaultLight कार्यान्वयन `engineColour + emission × fogFactor`। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है)
- **फ़ॉग प्रयोग क्रम**: फ्रैगमेंट भीतर प्रक्रिया क्रम ① प्रकाश·उत्सर्जन संश्लेषण → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogFactor)` → ④ light हुक आह्वान → ⑤ वापसी। अतः **engineColour फ़ॉग लगा हुआ आता है**, **light हुक वापसी मान ज्यों का त्यों अंतिम रंग** (हुक बाद फ़ॉग पुनः नहीं लगता)
- **fogFactor परिभाषा स्रोत**: दृश्य-अंतरिक्ष दूरी (शीर्ष इकाई संगणित·अंतर्वेशित)। linear विधा में `fogFactor = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 पर**: `fogColour` `vec3f(0.0)` (काला) होकर आता है। fogColour रंगत से समय अनुमान कोड सावधान रहे
- **वर्तमान बिल्ड वास्तविक फ़ॉग सेटिंग**: **linear स्थिर**। `fogStart` = आरेखन खंड दूरी, `fogEnd` = +1 खंड (क्षितिज ही)। फ़ॉग बंद सेटिंग में 100 / 101 खंड रखकर व्यावहारिक अमान्य। डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)
- इंजन के अंदर `bloxd_packInputs` नामक uniform है, पर **पैक सीधे संदर्भ नहीं ले सकते**। हुक निवेश फ़ील्डों (`s.time` आदि) से मान लें
- **`skyLight` / `blockLight` / `heldLight` "लिफ्ट वक्र" बाद के मान** होकर आते हैं। शीर्ष टिप्पणी का `tone-mapped` इसी को कहता है: इंजन फ्रैगमेंटों पर अवश्य `y = 1-(1-x/(3-2x))³` (अंधेरे उठाने वाला S वक्र) लगाकर पैकों को देता है। कच्चे वोक्सेल मान (n/15) नहीं; जैसे पेड़ नीचे (कच्चा 0.87) **0.97 उठकर** आता है
- `skyLight` वास्तव में "उस जगह से आकाश दिखता है" का वोक्सेल अवरोध डेटा (= शैडो मानचित्र) है, मात्र चमक पैरामीटर नहीं (अध्याय 15 "छाया का सत्य")

## 11. वेरिएंट सूची

| वेरिएंट | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + अलिट + टेरेन | – | – | ✓ |
| allow + अलिट + तरल | – | – | ✓ |
| allow + लिट + टेरेन | – | ✓ | ✓ |
| allow + लिट + तरल | – | ✓ | ✓ |
| strict + अलिट + टेरेन | ✓ | – | – |
| strict + अलिट + तरल | ✓ | – | ✓ |
| strict + लिट + टेरेन | ✓ | ✓ | – |
| strict + लिट + तरल | ✓ | ✓ | ✓ |

शीर्ष संरचना आकार भी वेरिएंट अनुसार बदलते हैं (strict में `bloxd_Vertex` स्वयं नहीं, अलिट में `blockLight` आदि नहीं, strict टेरेन में `alpha` नहीं)।

## 12. कंकाल चीटशीट

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // सीधा निर्माण निषिद्ध। हमेशा default से
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // टेरेन में केवल allow पर alpha है
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // प्रकाश-केवल निवेश सुरक्षित करें
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex अवश्य इस गार्ड सहित
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

हमेशा ध्यान रखने योग्य 5 बातें: सभी 8 वेरिएंट में साफ कंपाइल / strict खेल बहुमत / टेक्सचर नहीं / हुक पैरामीटर केवल-पठन / मॉड्यूल-स्कोप में `let` नहीं।

---

# भाग III: रेसिपी संग्रह

सभी टुकड़े 8 वेरिएंट पास की शर्त वाली गार्ड सहित लिखे हैं, ज्यों का त्यों कॉपी कर स्थिरांक बदलने भर से प्रयोज्य हैं। पर नीचे रेसिपी अलग-अलग उदाहरण हैं, ऊपर से सब जोड़ने के काम की नहीं — एक ही हुक नाम (`bloxd_terrain_light` आदि) या एक ही सहायक फ़ंक्शन नाम कई चिपकाने से एक ही मॉड्यूल में परिभाषा दुहराकर कंपाइल विफल करता है। कई प्रभाव साथ प्रयोग करें तो हुकों को प्रकार अनुसार 1 में समेटकर उस फ़ंक्शन में एकीकृत करें।

## R1. रंग रेसिपी (surface)

### एकल रंगत (सबसे बुनियादी)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### संतृप्ति बढ़त / घटाव

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 से चमकीला / -1.0 पूर्ण मोनोक्रोम
```

### वर्ण तापमान (गर्म ⇄ ठंडा)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = गर्म (लाल प्रबल), -1.0 = ठंडा (नीला प्रबल)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### विंटेज / सेपिया

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### ऊँचाई प्रवणता (निचली भूमि गर्म)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // ऊँचाई 0..50 पर 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### फलक अभिविन्यास से रंगना (ऊपर=उजला, दीवार=गाढ़ा)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // फ़र्श 1 / दीवार 0 / छत -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // दीवार थोड़ी गाढ़ी, छत भी गाढ़ी
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### पोस्टराइज़ेशन (रंग संख्या घटाना)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. प्रकाश रेसिपी (light)

### कंट्रास्ट S वक्र

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### दूरी धुंध (स्वनिर्मित फ़ॉग)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 64 ब्लॉक से 192 ब्लॉक पर 0..0.35 स्वनिर्मित फ़ॉग जोड़ना
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### रात (skyLight नीला झुकाव + दीया रक्षा)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### गुफा अंधेरा (skyLight-हीन और गाढ़ा)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` लिफ्ट बाद का मान है (अध्याय 10), हल्का अवरोध (पेड़ नीचे: कच्चा 0.87 → लिफ्ट बाद 0.97) इस विधि से लगभग गाढ़ा नहीं होता। गुफा (कच्चा 0) पर असर करता है। "वनछाया" स्पष्ट चाहिए तो R9.12 लिफ्ट व्युत्क्रम + देहली विधि प्रयोग करें।

### रात का नीला परिवेश (चंद्र दिशा बिना छद्म अभिव्यक्ति)

> इस API में सूर्यहीन आकाश का `sunDirection` शून्य है। नीचे दिशात्मक चांदनी नहीं, मात्र अंधेरे आकाश में क्षीण नीला परिवेश। चंद्र दिशा स्वयं `-sunDirection` से उपलब्ध (केवल दिन-रात चक्र दुनियाएँ। भाग VII R-A)।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### संध्या ताप (सूर्य ऊँचाई से रंग झुकाव)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // क्षितिज 1 / ठीक ऊपर 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### इंजन निर्गम पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // ※ bloxd_Light(...) सीधा निर्माण निषिद्ध। default से बनाकर colour बदलें
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (इंजन प्रकाश परिणाम) त्यागकर 「सामग्री रंग × स्वयं संगणित चमक」 रखें
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. उत्सर्जन रेसिपी (emission)

> `emission` प्रकाश गणना बाद जुड़ता है, पर डिफ़ॉल्ट प्रक्रिया **`fogFactor` से क्षीण करती है। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है। दूर भी चमकाने घटक emission में न जोड़ें, light हुक भीतर `out.colour += ...` सीधे जोड़ें** (engineColour फ़ॉग लगा हुआ अतः दूर धुंध वर्ण ऊपर प्रकाश चढ़ता है)

### दीया स्पंदन (मशाल श्वास)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### प्रदीप्त अयस्क भाव (उजली सामग्री चमके)

```wgsl
// surface पक्ष: सामग्री जितनी उजली (श्वेत) emission उतना चढ़ाएँ
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### जुगनू समूह भाव (काल से अंतरिक्ष तैरते प्रकाश बिंदु)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // कुछ 「प्रकाश गोल」 धीमे तैरते हैं। दूरी व्युत्क्रम से चमकाएँ
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)

### विश्व निर्देशांक

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### ब्लॉक निर्देशांक (आधिकारिक रेसिपी — शीर्ष टिप्पणी उद्गम)

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
```

### शतरंजी (ब्लॉक इकाई)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 या 1
out.colour *= mix(0.96, 1.04, checker);
```

### ब्लॉक इकाई छद्म यादृच्छिक (हैश)

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

### दृष्टि सदिश व रिमप्रकाश

```wgsl
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### दृष्टि कोण (फ्रेनेल भाव — तरल हेतु)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // ठीक ऊपर से 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. काल रेसिपी (एनिमेशन)

> `time` हर 3600 सेकंड (1 घंटा) लपेटता है। "1 दिन का दिन-रात चक्र" बनाने हेतु 3600 सेकंड 1 आवर्त मानें। पर शेडर बीता काल है, खेल के सूर्य·दिन-रात समन्वय की गारंटी नहीं। दिखावटी आवर्त एनिमेशन प्रयोज्य, वास्तविक रात निर्णय में `sunDirection` व प्रकाश निवेश को प्राथमिकता दें।

### दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 एक घंटा आवर्त। खेल के दिन-रात समन्वय की गारंटी नहीं
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### डोलन (बहु sin अध्यारोपण)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### बहती पट्टी अरोरा / प्रतिदीप्त पट्टी

```wgsl
// XZ स्थिति व काल से 3 रंग मिलाएँ
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. तरल रेसिपी

### जलपृष्ठ लहर (रंग झिलमिल)

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid सदा BLOXD_ALPHA — गार्ड आदतन
    #endif
    return out;
}
```

### ऊँचाई छद्म पारदर्शिता (सच्चा छिछला निर्णय नहीं)

> दृश्य गहराई व जलतल स्थिति संदर्भ असंभव, अतः इस API भर से वास्तविक जल गहराई परिकलित नहीं। `s.position.y` स्थानीय निर्देशांक, अतः ज्यों का त्यों प्रयोग से खंड मूल विचलन से प्रभाव हटता है। नीचे केवल विश्व ऊँचाई से alpha बदलने का छद्म प्रदर्शन, तटरेखा व जलतल अनुरूप छिछला अभिव्यक्ति नहीं। `packWaterReferenceY` विश्व ऊँचाई अनुरूप समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // निम्न ऊँचाई पतला, उच्च ऊँचाई मूल alpha निकट। खेल में दिशा जाँचें।
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### जलांदर से देखा जल धुंध

```wgsl
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### केवल-तरल पैक (टेरेन अक्षत रचना)

```wgsl
// terrain_* हुक बिल्कुल न लिखें। तब:
//  - terrain वेरिएंट = हुकहीन = टेरेन इंजन मूल ज्यों का त्यों
//  - liquid वेरिएंट  = केवल liquid_* हुक प्रभावी
```

## R7. वर्टेक्स रेसिपी (केवल allow)

> सब `#ifndef BLOXD_STRICT` से लपेटें।

### घास पवन दोलन (शीर्ष ही हिलाएँ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // लंब फलक ही
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### द्रव पृष्ठ तरंग (शीर्ष फलक ही)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### स्पंदित टेरेन

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // अभिलंब दिशा में हल्का फैलाव-सिकुड़न
    return out;
}
#endif
```

### लहराता टेरेन (विशाल sin तरंग)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. गणित छोटी युक्ति संग्रह

```wgsl
// 0..1 मसृण श्रेणीकरण (n श्रेणी)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-स्तरीय देहली (टून छाया)
let shadow = smoothstep(0.35, 0.37, level);   // देहली ±0.02 से सीढ़ी बनती है

// 3-स्तरीय टून
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// लूमा (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// मसृण स्पंदन
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// त्रिभुज तरंग (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// सेकंड → "धीमी कला" रूपांतरण (3600 सेकंड लपेटन अनदेखा करने वाले इफ़ेक्ट हेतु)
let phase = t * 0.15;
```

## R9. यथार्थवादी रेसिपी

> "वैनिला रूप सामग्री से पुनर्गठन" भौतिक रेसिपी संग्रह। आधार शर्तें:
>
> 1. **light हुक फ्रैगमेंट अंतिम चरण में बुलाया जाता है**। लौटाया colour ज्यों का त्यों अंतिम रंग। **स्वयं फ़ॉग दोबारा लगाना आवश्यक** (R9.10)  
> 2. **इंजन मूल प्रकाश केवल गुणन** है। स्पेक्युलर / फ्रेनेल / उष्ण-शीत पृथक्करण / अर्धगोल परिवेश शून्य से बनाएँ  
> 3. `l.engineColour` पूर्ण रंग (फ़ॉग लगा हुआ) है। त्यागकर `s.colour` (एल्बिडो) से पुनर्गठन ही प्रामाणिक मार्ग है  
> 4. टेक्सचर निषिद्ध → विवरण सब **प्रक्रियात्मक** (हैश/शोर) डालें (R9.8)

### R9.1 उष्ण मशाल × शीत आकाशप्रकाश

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    out.colour = s.colour * voxel;
    #endif
    return out;
}
```

### R9.2 सूर्य स्पेक्युलर (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let h = normalize(viewDir + sunDir);          // अर्ध सदिश
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick फ्रेनेल

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // किनारे की हल्की चमक
    #endif
    return out;
}
```

### R9.4 अर्धगोल परिवेश (ऊपर=आकाश / नीचे=भूमि उछाल)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // नीचे: उछाल
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
    #endif
    return out;
}
```

### R9.5 ACES फ़िल्मिक (Narkowicz सन्निकटन)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = अनावृति
    return out;
}
```

### R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी से संतृप्ति गिरने की 「हवा भावना」)

> फ़ॉग (रंग प्रतिस्थापन) से अलग 「दूरी से विसंतृप्त」 चढ़ाने से  
> दूर दृश्य कहीं यथार्थ बनता है।  
> ध्यान: वायु भावना केवल संतृप्ति घटाने से सुरक्षित। चमक न छुएँ।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // दूरी क्षय (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // संतृप्ति ही घटाएँ (चमक अपरिवर्तित)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 तरंग अभिलंब + सूर्य चमक (जल पर 「सूर्य मार्ग」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // ऊँचाई h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 प्रक्रियात्मक सूक्ष्म उभार (टेक्सचर निषेध चकमा)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ब्लॉक भीतर स्थानीय निर्देशांक
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 गुफा अरैखिक अंधेरा + दीया रक्षा

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // दीये वाली जगह उठाएँ
    out.colour *= mix(keep, 1.0, sky * sky);     // अंधेरा अरैखिक (वर्ग)
    #endif
    return out;
}
```

### R9.10 फ़ॉग पुनः लगाना (engineColour त्याग पर आवश्यक)

> `l.fogFactor` को `max(l.fogFactor, 0.25)` निम्नसीमा सहित प्रयोग से "इससे सघन नहीं" समायोजन बनता है  
> (0.0 = इंजन अनुरूप / 0.3–0.5 = दूर स्पष्ट)।  
> ध्यान रहे इंजन फ़ॉग क्षितिज समर्पित linear फ़ॉग (आरेखन दूरी समीप ही) है, मध्य दूरी धुंध पैक पक्ष बनाएँ।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन मिलान अद्यतित): linear स्थिर / `fogStart` = आरेखन खंड दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद सेटिंग में 100–101 खंड व्यावहारिक अमान्य / डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // फ़ॉग पुनरुत्पादन (0.15=हल्की निम्नसीमा)
    col += s.emission * l.fogFactor;            // emission भी फ़ॉग सहित
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 सिनेमा-ग्रेड (छाया शीत / हाइलाइट उष्ण / रात विसंतृप्त)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let night = 1.0 - sunPresent;  // सूर्य दिशा शून्य पर ही रात। संध्या सतत परिवर्तन अभिव्यक्त नहीं
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 प्रक्षेपण छाया —— लिफ्ट व्युत्क्रम + देहली कट (निर्णायक)

> **आधार पुनःपुष्टि (अध्याय 10)**: `l.skyLight` कच्चा voxel मान (n/15) नहीं, बल्कि इंजन "लिफ्ट वक्र"  
> `y = 1-(1-x/(3-2x))³` (अंधेरी जगह उठाने वाला S वक्र) पार करने के बाद का मान।
>
> | स्थान | voxel कच्चा | लिफ्ट बाद (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | खुला आकाश | 1.00 | 1.00 | 1.00 |  
> | पेड़ नीचे (त्रिज्या2) | 0.87 | **0.97** | **0.86** ← लगभग अक्षत |  
> | त्रिज्या3 | 0.80 | **0.92** | 0.66 |  
> | त्रिज्या5 | 0.67 | 0.78 | 0.29 |
>
> **यही "गामा उठाकर भी छाया सघन नहीं" का सिद्ध कारण** है (संख्यात्मक प्रमाण)। पर वक्र एकदिष्ट है अतः बीजीय कठोर व्युत्क्रमण संभव:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`। कच्चा मान पुनः प्राप्त कर, बाद **देहली कट** (`smoothstep`) से द्विमानीकरण मात्र।  
> LightEngine BFS पाश्व प्रसार "सन्निकट 1 ब्लॉक = -1" अतः देहली `th = 1 - r/15` सीधे  
> "r ब्लॉक व अधिक अवरोध छाया मानो" डायल बनता है। ब्लॉक तोड़ते ही छाया चलती है (LightEngine वास्तविक-समय पुनर्गणना)।  
> सीमा: छाया "ऊपरी आकाश" आधार अतः सूर्य गति से घूमती नहीं (अध्याय 15 "छाया का सत्य")।

```wgsl
// ★इंजन लिफ्ट कठोर व्युत्क्रमण, कच्चा voxel skyLight (n/15) पुनः प्राप्त
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL में cbrt नहीं अतः pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★छाया त्रिज्या डायल: th = 1 - r/15 (0.87→त्रिज्या2 व अधिक छाया)
const shSoft = 0.04;   // किनारा कोमलता (0.02=कठोर / 0.08=कोमल)
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. कच्चा मान पुनः प्राप्त (छूटा तो कभी छाया नहीं)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. देहली कट — धूप=1 / छाया=0 निश्चयपूर्वक पृथक् करें
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // सूर्य Lambert (सूर्य न होने पर l.directional पर फॉलबैक)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★प्रक्षेपण सार: सूर्य सीधी धूप "आकाश दिखने वाली जगह" पर ही पहुँचती है
    let lit = sunL * sky;
    // छायापक्ष: काला नहीं, आकाश-रंजित + न्यून परिवेश
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // मशाल प्रकाश छाया भेदता है (blockLight भी लिफ्ट बाद अतः साथ पुनः प्राप्त)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // फ़ॉग पुनः लगाएँ (engineColour त्याग अंश)
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col, vec3f(0.0), vec3f(1.0));
    #endif
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल `shTh` ही निर्धारित** — `0.93`=त्रिज्या1.5 ऊपर / `0.87`=त्रिज्या2 / `0.80`=त्रिज्या3 / `0.67`=त्रिज्या5।  
> छाया किनारा कठोरता `shSoft` (0.02=कठोर / 0.08=कोमल)। छाया क्रोड अंधेरा `0.09` (न्यूनतम परिवेश) व `0.16` (आकाश प्रकीर्ण प्रकाश)  
> 2-बिंदु स्थानांतरण से तय होता है। संध्या में छाया फैलानी हो तो  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी संध्या छाया सन्निकटन।  
> `sunDir` यानी `l.sunDirection / length(l.sunDirection)`)। छाया नीलापन हेतु `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।
>
> ⚠️ "`pow(skyLight, γ)` से कंट्रास्ट गहरा" **लिफ्ट बाद मानों पर gamma लगा रहा था** इसलिए  
> पेड़ नीचे (0.97) कभी प्रभावित नहीं हुआ। यह विधि अनुशंसित नहीं।

---

# भाग IV: यथार्थवाद गाइड

## 13. इंजन डिफ़ॉल्ट प्रकाश व यथार्थ गुंजाइश

इंजन डिफ़ॉल्ट प्रकाश केवल "गुणन" है, स्पेक्युलर, फ्रेनेल, उष्ण-शीत पृथक्करण, अर्धगोल परिवेश मौजूद नहीं। पुनर्निर्माण योग्य सीमा:

| कार्य | डिफ़ॉल्ट | पैक में संभव? |
|---|---|---|
| विसरित (Lambert) | केवल दिशात्मक अदिश योग | ◎ `sunDirection` से स्वयं कार्यान्वित (आवरण स्रोत आदि) |
| स्पेक्युलर (दर्पण परावर्तन) | कुछ नहीं | ◎ Blinn-Phong (R9.2) |
| फ्रेनेल | कुछ नहीं | ◎ Schlick सन्निकटन (R9.3) |
| उष्ण मशाल / शीत आकाशप्रकाश पृथक्करण | अवर्ण | ◎ (R9.1) |
| अर्धगोल परिवेश | अदिश | ◎ ऊपर=आकाश वर्ण / नीचे=भूमि प्रतिक्षेप (R9.4) |
| तान मानचित्रण | नहीं (केवल clamp) | ◎ ACES फ़िल्मिक (R9.5) |
| वायुमंडलीय परिप्रेक्ष्य | केवल फ़ॉग (रंग प्रतिस्थापन) | ◎ दूरी विसंतृप्ति (R9.6) |
| पृष्ठ विवरण | केवल टेक्सचर विभेदन | △ हैश शोर प्रक्रियात्मक सूक्ष्म उभार (R9.8) |
| शीर्ष तरंग (जलपृष्ठ) | कुछ नहीं (समतल) | ◎ केवल allow (R7) |
| तरंग अभिलंब / सूर्य चमक | कुछ नहीं | ◎ (R9.7) |
| रात्रि चंद्रप्रकाश निरूपण | केवल आकाशवर्ण अंधेरा | △ चंद्र दिशा `-sunDirection` में: छद्म अभिव्यक्ति (R2 नीला परिवेश / R9.11) संग दिशात्मक चांदनी (R-A, केवल दिन-रात चक्र) |
| छाया (आकाश अवरोध) | केवल `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` हल्का मिश्रण | ◎ लिफ्ट व्युत्क्रम + देहली कट + सूर्य गेट (R9.12)। वृक्ष छाया, छज्जा नीचे स्पष्ट अवनमन, ब्लॉक संपादन वास्तविक-समय अनुगमन |

## 14. यथार्थवाद कार्यान्वयन पंथ —— दो

**पंथ A: योगात्मक संशोधन (defaultLight आरंभ)** —— `engineColour` (पूर्ण रंग) आधार मान, उष्ण दीप्ति व रिम प्रकाश जोड़ें। हल्का व सुरक्षित, पर प्रकाश प्रतिरूप डिफ़ॉल्ट ही रहता है।

**पंथ B: पूर्ण पुनःप्रकाशन (s.colour आरंभ)** —— `l.engineColour` त्यागकर, `s.colour` (एल्बिडो) व LightIn कच्ची सामग्री से प्रकाश पुनर्गठित करें। यथार्थवाद का प्रामाणिक मार्ग। 4 नियम मानें:

1. **फ़ॉग पुनः लगाएँ**: light हुक फ़ॉग के बाद चलता है, स्वयं `mix(l.fogColour, col, l.fogFactor)` लगाएँ (R9.10)। घने फ़ॉग में `max(l.fogFactor, 0.3)` निम्नसीमा रखें। उल्टा engineColour-आधारित पैकों में और फ़ॉग रंग मिलाने से श्वेत द्वि-फ़ॉग बनता है
2. **अप्रकाशित वेरिएंट वापसी**: `#ifdef BLOXD_LIGHTING` के बाहर सीधे `defaultLight` लौटाएँ
3. **साझा फ़ंक्शन समग्र रक्षा**: `bloxd_LightIn` पैरामीटर वाले साझा फ़ंक्शन पूरे fn सहित `#ifdef BLOXD_LIGHTING` में लपेटें (केवल कॉल-स्थल अपर्याप्त)
4. **सूर्य दिशा अनुपस्थिति पर**: `sunDirection` शून्य हो तो दिशात्मक स्पेक्युलर न गिनें। `l.directional` प्रकाश-मात्रा अदिश है, दिशा सदिश नहीं; झलक दिशा पुनः प्राप्त नहीं होती। आवश्यक हो तो अदिशात्मक मंद परिवेश पर जाएँ। चंद्र दिशा `-sunDirection` से उपलब्ध (केवल दिन-रात चक्र दुनियाओं में गतिशील। भाग VII R-A)

## 15. अप्राप्य रूप (यथार्थवाद की "छत")

| रूप | कारण |
|---|---|
| पिक्सेल-सटीक छाया मानचित्र (सूर्य संग घूमती छाया, उपच्छाया) | गहराई टेक्सचर संदर्भ असंभव। किरण अवरोध निर्णय हुकों में निवेश नहीं |
| SSAO | दृश्य गहराई अगम्य (केवल जाल सेकी वर्टेक्स AO) |
| SSR (परावर्तन) | वही। केवल फ्रेनेल मिश्रित आकाश वर्ण छद्म |
| ब्लूम / चकाचौंध | पश्च-प्रक्रमण में हुक नहीं |
| क्षेत्र गहराई, वर्ण विपथन, दाना | पूर्ण-परदा पश्च-प्रक्रमण आवश्यक |
| आयतन प्रकाश (god rays) | वही |
| PBR टेक्सचर | टेक्सचर पठन निषिद्ध। केवल वर्ण चमक छद्म अनुमान |
| जलांत अपवर्तन | दृश्य गहराई निवेश नहीं |
| जलांत आवरण (नीला रंगत) हटाव / बदलाव | आवरण "कैमरा तरल खंड परिभाषा color/alpha" जनित emissive पूर्ण-परदा quad है, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित, अतः पैक न वर्ण न सघनता बदल सकता |
| जलांत सीधा संसूचन | कैमरा निमज्जन दर्शाने वाला निवेश नहीं, जलांत में fogStart / fogEnd / fogColour अपरिवर्तित अतः fogFactor आदि से अनुमान की विश्वसनीय विधि भी नहीं |

### छाया का सत्य —— "वृक्ष छाया" बनती है

ऊपर तालिका में असंभव केवल **सूर्य संग घूमते पिक्सेल-सटीक छाया मानचित्र** हैं। इंजन आरंभ से "छाया" गिन रहा है, वही `skyLight` है। जाल-पक्ष LightEngine माइनक्राफ्ट-ढंग कलनविधि चलाता है:

1. **स्तंभ क्रमवीक्षण**: हर (x,z) स्तंभ ऊपर से नीचे क्रम देखें। आकाश आगमन 15 से आरंभ, **अपारदर्शी ब्लॉक पर 0**, बाद `lightFilter` (वायु 1 / जल 3 / अपारदर्शी 15) अनुसार क्षीण उतरता है
2. **BFS बाढ़**: 6 पड़ोस पाश्व प्रसार (हर खंड -1) —— यही किनारा कोमलता का सत्य है। त्रिज्या r अवरोध नीचे कच्चा मान (15-r)/15 होता है
3. blockLight (मशाल आदि) RGB 3 प्रणाली (4bit संवेष्टन) का अन्य BFS है

अतः `l.skyLight` मात्र चमक प्राचल नहीं, **"उस जगह से आकाश दिखता है" का वोक्सेल विभेदन अवरोध डेटा = छाया मानचित्र** है। वृक्ष नीचे, छज्जा नीचे, भीतर अंकतः पहले से निम्न, शीर्ष अंतर्वेशन चिकना पहुँचता है। रखने/तोड़ने पर ब्लॉक तत्काल पुनर्गणना = **वास्तविक-समय अनुगामी छाया**। मूल केवल `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` "हल्का मिश्रण" प्रयोग करता है।

सही उपकरण R9.12 के दो चरण हैं (**लिफ्ट व्युत्क्रम से कच्चा मान पुनः प्राप्त → देहली `smoothstep` द्विमानीकरण**। `th = 1 - r/15` सीधे "छाया मानने वाला अवरोध त्रिज्या" डायल करता है) साथ **सूर्य सीधी धूप sky गेट सहित** (सूर्य केवल आकाश दिखने वाली जगह पहुँचता है = प्रक्षेपण सार), धूप=उष्ण वर्ण / छाया=शीत वर्ण रंगरोगन रचना सहित।

**सच्ची सीमा कथन**: यह छाया "ऊपरी आकाश" आधार अतः **सूर्य गति से घूमती नहीं**। विभेदन खंड स्तर (कोमल किनारा BFS प्रसार से)। इंजन प्रकाश साँचे में बंद `var shadow: f32 = 1.;` छाया मानचित्र ठूँठ अब भी अवशिष्ट है (सदा 1.0 = अमान्य), "योजित पिक्सेल-सटीक घूर्णी छाया" अवशेष व्याख्येय। पिक्सेल-सटीक घूर्णी छाया ही चाहिए तो API बाह्य मार्ग शेष (जैसे userscript GLSL अंतःक्षेप, नियम जोखिम सहित)।

### जलांत सत्य

जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogFactor भी संसूचित नहीं करता)।

## 16. दोषमार्जन युक्तियाँ

- गुफा अधिक उजली → `skyLight` अरैखिक वक्र अभाव (R2 गुफा रेसिपी / R9.9)
- दिन अधिक अनावृत → ACES पूर्व अनावृति घटाएँ
- रात अदृश्य अंधेरी → न्यून परिवेश सुनिश्चित करें (रात्रि `skyLightColour` आधारतः निकट-काला)
- दूर धुंध अधिक → वायुमंडल गुणांक घटाएँ
- मशाल चारों ओर नारंगी → उष्ण मिश्रण अनुपात घटाएँ (कच्चा रंजित प्रकाश अंश रखें)
- खंड लगभग पूर्णतः श्वेत → light हुक निर्गम योग 1.0 अधिक (अनुप्रवाह clamp नहीं)। अंत में `clamp(col, vec3f(0.0), vec3f(1.0))` लगाएँ
- योग बिना श्वेत → fogFactor विभाजन un-fog व्युत्क्रमण कारण। un-fog हटाएँ; पुनर्निर्माण `s.colour` आधार, फ़ॉग अंत में एक बार `mix`
- उत्सर्जक खंड नहीं चमकते → पुनर्निर्माण क्रम में emission पुनर्योग चूक। `+ s.emission * l.fogFactor` जोड़ें
- रात केवल प्रदीप्त फलक शेष → केवल छाया न दबाएँ, पूर्ण रंग (`engineColour`) समग्र रात्रि क्षय लगाएँ। स्थानीय दीये रखें तो `blockLight` / `heldLight` से क्षय घटाएँ (छठा भाग 19)
- `pow(skyLight, γ)` कितना भी छाया सघन नहीं → `l.skyLight` लिफ्ट बाद मान (अध्याय 10)। R9.12 व्युत्क्रम + देहली कट पर जाएँ
- छाया क्षेत्र/सघनता समायोजन चाहिए → R9.12 समायोजन मार्ग देखें (क्षेत्र=देहली `shTh` / किनारा=`shSoft` / छाया क्रोड अंधेरा=न्यून परिवेश व आकाश प्रकीर्ण प्रकाश दो-बिंदु विचलन)

---

# भाग V: समस्या-निवारण व टिप्पण

## 17. सामान्य त्रुटि व सुधार

| लक्षण | सुधार |
|---|---|
| strict खेल लोड नहीं | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `.alpha` अपरिभाषित कथित | `#ifdef BLOXD_ALPHA` में लपेटें |
| `blockLight` अपरिभाषित कथित | `#ifdef BLOXD_LIGHTING` में लपेटें। साझा सहायक फ़ंक्शन **समग्र फ़ंक्शन** लपेटें |
| `Packs can't construct bloxd_Surface directly` | `bloxd_defaultSurface(s)` से आरंभ बदलें |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` में लपेटें |
| दूर श्वेत धुंधला | बहुधा द्वि-फ़ॉग। पूर्ण रंग फ़ॉग लगा हुआ, स्वनिर्मित संयत रखें, संतृप्ति ही घटाना श्रेष्ठ |
| खेल प्रवेश पर पैक निष्कासित | खेल आरंभ वास्तविक-मशीन जाँच विफल। रक्षक चूक पुनः देखें |
| `pack.json needs "apiVersion": 1.` | `apiVersion` अभाव। अंक `1` पूरें (स्ट्रिंग `"1"` अस्वीकृत) |
| `There's no pack.json at the top of the pack.` | ZIP मूल में `pack.json` नहीं। फ़ोल्डर समग्र संवेष्टित जाँचें |
| `bloxd_terrain_vertex must be declared as: fn ...` | हस्ताक्षर भिन्न। दर्शित घोषणा अक्षरशः पुनः लिखें |
| `bloxd_terrain_vertex can't run in strict games...` | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` में लपेटें |
| `pow(l.skyLight, γ)` कितना भी छाया सघन नहीं | `skyLight` लिफ्ट वक्र बाद मान (कच्चा 0.87 से 0.97 आगमन)। R9.12 लिफ्ट व्युत्क्रम + देहली कट पर जाएँ (अध्याय 10) |
| `... can only be a function's parameter or return type, ...` | अनारंभिक `var x: bloxd_Surface;` अस्वीकृत। `bloxd_default*` से बनाएँ |
| `bloxd_packInputs isn't part of the bloxd_ header` | PackInputs uniform पैक से संदर्भ नहीं। हुक निवेश फ़ील्ड (`s.time`, `s.originOffset`, `s.sunDirection`) से लें |
| `Packs can't declare bloxd_ names...` | अपने पहचानकर्ताओं से `bloxd_` उपसर्ग हटाएँ। केवल 6 हुक नाम परिभाषित कर सकते |
| `loadDuplicateManifest` (zip पठन में) | `pack.json` 2 हैं (अक्षर-भेद सहित)। 1 करें |
| `Packs can't construct bloxd_Surface directly, since header structs gain fields; ...` | `bloxd_defaultSurface(s)` से आरंभ बदलें। light हुक प्रथम प्राचल प्रतिलिपि (`var out = s;`) से आरंभ भी योग्य |

## 18. अधिकार व टिप्पण

- शेडर पैक कार्य स्वयं खेल UI से लोड होने वाली आधिकारिक कार्य है, पैक निर्माण अपेक्षित व्यवहार मान्य है। पर सार्वजनिक आधिकारिक दस्तावेज़ अपुष्ट है
- पैक शुद्ध WGSL है, JS निष्पादन व जाल अभिगम रचनातः असंभव
- यह पुस्तक अनौपचारिक मार्गदर्शिका है, विकासकों की आधिकारिक स्थिति नहीं। API कभी भी बदल सकती है

---

# भाग VI: महत्वपूर्ण कार्यान्वयन पूरक

## 19. रात्रि "छाया काली फलक उजला" सुधारें

केवल छाया दबाने से, सूर्य अनुपस्थिति में इंजन पूर्ण रंग (`engineColour`) अब भी उजला रहता है, फलक-छाया अंतर अप्राकृतिक दिखता है। पूर्ण रंग समग्र क्षय लगाकर उत्तर दें।

नीचे उदाहरण `sunDirection` शून्य रात्रि निर्णय, दिशायुक्त दिन निर्णय मान, रात्रि टेरेन पूर्ण रंग क्षय करता है। `blockLight` व `heldLight` प्रबल स्थल क्षय घटाकर, मशाल आदि निकट प्रकाश यथासंभव रखें। `0.52` समायोज्य मान है, अधिक अंधेरा चाहिए तो घटाएँ।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // पूर्ण रंग क्षय, सामग्री emission डिफ़ॉल्ट अनुसार फ़ॉग सहित योग
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**इस निरूपण की सीमा:** यदि `sunDirection` "सूर्य=इकाई दिशा, नहीं=शून्य" द्विमान हो, दिन-रात पृथक् संभव पर संध्या क्षीण सतत अनुमान असंभव। और पूर्ण रंग क्षय से, इंजन दिन-प्रकाश व परिवेश एक साथ क्षीण होते हैं, पूर्ण कालपट्टी पुनरुत्पादन नहीं। तरल भी वही निरूपण चाहिए तो तरल हुक वापसी संबंध जाँचें।

## 20. जल प्राकृतिक दिखाने वाली जल समेकित रेसिपी

यह API दृश्य वर्ण, गहराई व जलतल गहराई नमूना नहीं ले सकता, अतः **फ्रेनेल पवन वर्ण मिश्रण व सूर्य झलक छद्म अभिव्यक्ति है, वास्तविक परावर्तन/अपवर्तन/जल गहराई परिकलन नहीं**। नीचे आधार वर्ण रखते हुए, छिछले दृष्टिकोण निकट-आकाश वर्ण मिलाकर, केवल सूर्य रहते छोटी चमक जोड़ने का नमूना है।

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

समायोजन संदर्भ:

- जल श्वेत/अति उजला: `fresnel * 0.38` का `0.38` व चमक `0.55` घटाएँ।
- जल अति सघन: `fakeSkyReflection` मिश्रण अनुपात थोड़ा बढ़ाएँ। पर अधिक प्लास्टिक जैसा।
- जलपृष्ठ रेखा व नियमित धारी दिखे: तरंग आवृत्ति व चमक तीव्रता घटाएँ। इस कोड में जलपृष्ठ जाल शीर्ष विस्थापन नहीं।
- वास्तविक दृश्य प्रतिबिंब चाहिए: इस API निवेश में परदा वर्ण व दृश्य गहराई नहीं, केवल वर्ण मिश्रण से सत्य परावर्तन नहीं।

यह रेसिपी **विद्यमान `bloxd_liquid_light` प्रतिस्थापित** करती है। R9.7 समनाम तरंग अभिलंब फ़ंक्शन व अन्य समनाम हुकों से दुहरा चिपकाएँ नहीं।

## 21. वास्तविक-मशीन परीक्षण सूची

कंपाइल सफलता व "सुंदर" अलग बातें हैं। क्रम से जाँचें:

1. **लोडिंग:** `pack.json` ZIP मूल में हो, सेटिंग `Ready to use` दिखाए।
2. **8 वेरिएंट:** strict / allow, प्रकाश चालू / बंद, टेरेन / तरल हर शर्त प्रकार रक्षक चूक न हो। खेल भले आंशिक शर्त प्रयोग करे, वितरण पैक 8 मानकर चले।
3. **दिन:** घास, पत्थर, बालू, लकड़ी आदि सामग्री वर्ण अनतिबहि, शीर्ष व पार्श्व प्रकाश-छाया संक्रमण प्राकृतिक हो।
4. **रात:** सूर्यप्रकाश स्थल सम सामग्री, छाया, मशाल समीप तुलना करें। केवल प्रदीप्त फलक शेष तो अनावृति क्षय, समग्र अंधेरा तो स्थानीय प्रकाश रक्षा समायोजित करें।
5. **जल:** ठीक ऊपर, छिछला दृष्टिकोण, तट, जलांत, रात अलग-अलग देखें। alpha व्यवहार व जलांत दृश्य खेल संश्लेषण विधि निर्भर, एकल दृष्टिकोण निर्णय न करें। जलांत में तरल परिभाषा आवरण ऊपर कथन अनुसार सामने ढकता है, अतः पैक अंतर मुख्यतः पृष्ठ व आवरण पार टेरेन में देखें।
6. **सीमा व दूर:** खंड/मूल संक्रमण पर तरंग पैटर्न उछलता न हो, दूर द्वि-फ़ॉग व श्वेत धुंध न हो।
7. **प्रदर्शन:** प्रति-फ्रैगमेंट हैश/त्रिकोणमिति/`pow` भारी प्रभाव न्यूनतम रखें। विवरण धीरे-धीरे जोड़कर FPS तुलना करें।

### ज्ञात निर्बंध आधार मानकर

- पैक टेरेन/तरल हुक सीमित, एक ही कोड आकाश, एंटिटी व UI निरूपण नहीं।
- छाया मानचित्र जोड़ने, परदा-स्थान परावर्तन, दृश्य गहराई, अपवर्तन, ब्लूम आदि निवेश नहीं।
- `time` एनिमेशन काल है, खेल दिन-रात संबंध गारंटी नहीं।
- `sunDirection` शून्य तो सत्य चंद्र दिशा अज्ञात, वातावरण सन्निकटन "चंद्र भौतिकी" नहीं। दिशात्मक चांदनी `-sunDirection` से बनती है (केवल दिन-रात चक्र दुनियाएँ। भाग VII R-A)।
- `s.position` / `l.position` स्थानीय निर्देशांक, विश्व निर्भर प्रभाव हेतु `originOffset` जोड़ें। खंड भीतर स्थानीय पैटर्न हेतु सचेत स्थानीय निर्देशांक प्रयोग करें।

## 22. शेडर सीमा आने पर संयोजन

शेडर पैक टेक्सचर न जोड़ न नमूना ले सकता, अतः सामग्री सूक्ष्म उभार व आकाश चित्र केवल शेडर से हल न करें। Bloxd.io सार्वजनिक टेक्सचर पैक भंडार [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) टेक्सचर, आकाशपेटी, प्रतिरूप आदि अन्य विधि निरूपित करता है।

संदर्भ हेतु, समुदाय प्रचलित "cinematic shader" वितरण विश्लेषण से टेक्सचर पैक निकला (128x128 टेक्सचर, `pack.json` / `.wgsl` रहित)।

वास्तविकता में, **प्रकाश व वर्ण शेडर से समायोजित कर, सामग्री व आकाश अनुरूप संसाधन पैक से पूरा** करना उत्तम है। पर सहप्रयोग संभावना व पठन क्रम खेल कार्यान्वयन व सेटिंग अनुसार जाँचें।

## 23. शेडर पैकों सहित जलांत सत्य

जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogFactor भी संसूचित नहीं करता)।

---

# भाग VII: आंतरिक पूरक

इंजन कार्यान्वयन विश्लेषण से ज्ञात अतिरिक्त विनिर्देश। सब वर्तमान उत्पादन बिल्ड JavaScript से सीधे पुनः प्राप्त।

## 24. सूर्य व चंद्रमा अभिज्ञान

`l.sunDirection` स्रोत केवल आकाशपेटी प्रकार बदलने पर पुनर्लिखित सूर्य दिशा बफर है — कसौटी "आकाश में सूर्य है" नहीं, **"आकाशपेटी पृथ्वी प्रकार है"** है।

| आकाशपेटी | `l.sunDirection` |
|---|---|
| `default` (प्रक्रियात्मक आकाश) | अशून्य (डिफ़ॉल्ट नीचे) |
| `gloomy` / `interstellar` / `space_*` (घन टेक्सचर) | **सदा (0,0,0)** |

**चंद्रमा सदा `-sunDirection` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। रात्रि सूर्य ऊँचाई से जाँची जाती है — `sunDirection.y < 0` (सूर्य क्षितिज नीचे) पर चंद्रमा ऊपर है। पर डिफ़ॉल्ट दुनियाओं में सूर्य स्थिर, अतः चंद्रमा भी स्थिर — गतिशील चंद्रमा केवल दिन-रात चक्र दुनियाओं में दिखता है।

डिफ़ॉल्ट दुनिया सूर्य दिशा लगभग `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 से संगणित इकाई सदिश, स्थिर)। वितरण पैक परीक्षण में झलक दिशाएँ कागज़ पर भविष्यवाणी का व्यावहारिक संदर्भ मान।

दिन-रात चक्र इंजन में अंतर्निहित नहीं — inclination स्थिर अंक है, गतिशील दिन वाली दुनियाएँ खेल पक्ष अद्यतित करती हैं। हर अद्यतन पर `sunDirection` भी पुनर्लिखित अनुगमन करता है।

टेरेन दिशात्मक प्रकाश दृश्य आरंभ निर्मित केवल 2 दीप हैं, **दिशा व तीव्रता स्थिर, दिन-रात अपरिवर्तित**। संक्षेप में **टेरेन चमक का कोई घटक काल निर्भर नहीं। दिन-रात "रूप" केवल आकाशपेटी व sunDirection से आते हैं**, अतः रात्रि अवनमन पैकों को समय-पट्टी स्वयं sunDirection से अनुमान करनी चाहिए (§19 `sunPresent` तकनीक)।

### R-A. दिशात्मक चांदनी — moonDir = −l.sunDirection

चंद्रमा ऊपर रहते ही नील-श्वेत Lambert व मंद स्पेक्युलर जोड़ता है। `moonUp` डिफ़ॉल्ट स्थिर-सूर्य दुनियाओं में 0 है, वहाँ कुछ नहीं होता — **केवल दिन-रात चक्र दुनियाओं में छूटने वाली सुरक्षित चांदनी**।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // चंद्रमा सदा सूर्य के ठीक विपरीत; दिन में moonDir.y < 0 से स्वतः बुझता है
    let moonDir = -l.sunDirection;
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(l.eyePosition - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. फ़ॉग आंतरिक

फ़ॉग परिकलन सदा LINEAR विधा (`fogFactor = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` सहित (D = फ़ॉग सेटिंग; केवल D = 0 विशेष fogEnd = 5 सहित)। **प्रवणता पट्टी केवल 32 खंड चौड़ी** है, व `l.fogFactor` "दूरी धुंध" से कम **लोडेड दुनिया किनारे तक प्रसामान्यीकृत दूरी** है। खिलाड़ी अनुसार लोड दूरी बदलती है, अतः दूरी प्रभाव स्वयं `distance(l.position, l.eyePosition)` गिनें (रेसिपी R-B)।

डिफ़ॉल्ट फ़ॉग वर्ण `rgb(183, 191, 195)` (हल्का नील-धूसर)। दुनिया रचयिता `fogColourOverride` (hex) से बदलते हैं। फ़ॉग विधा 0 (NONE) पर **fogColour काला आता है**। मानक रूप `mix(l.fogColour, col, l.fogFactor)` सुरक्षित क्योंकि फ़ॉग वर्ण fogFactor 1 पर अप्रयुक्त रहता है।

खिलाड़ी-पक्ष `showFog` बंद करने पर फ़ॉग 3200–3328 खंड धकेला जाकर व्यावहारिक अमान्य होता है (`fogFactor ≈ 1` आता रहता है)।

### R-B. लोड-सीमा पट्टी — fogFactor "दुनिया किनारा" रूप में

लोड-सीमा की 32-खंड पट्टी ही चुपचाप शीतल कर दुनिया अंत छिपाता है (या प्रभावतः रेखांकित करता है)। स्वयं दूरी गिने बिना, खिलाड़ी लोड-दूरी सेटिंग स्वतः अनुगमन ही लाभ है।

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    // fogFactor: 1 = भीतर (किनारे तक गुंजाइश), 0 = किनारे बाहर निकलने वाला
    let edge = 1.0 - l.fogFactor;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight आंतरिक

`aPackedLightLevels` विकोडन पर इंजन हर प्रणाली **उज्ज्वलतम RGB प्रणाली के 35% का फ़र्श** बिछाता है। जैसे "शुद्ध लाल प्रकाश" शीर्षों में (1.00, 0.35, 0) उठकर अंतर्वेशन·लिफ्ट चढ़ता है। मशाल नारंगी खेल में "लाल से अधिक श्वेत-गुलाबी" दिखना यहीं से है — उष्ण मशाल रेसिपी (R9.1) संतृप्ति इस डिफ़ॉल्ट विरुद्ध समायोजित करें।

हस्त प्रकाश (`heldLight`) परास उज्ज्वलतम प्रकाश वर्ण अनुसार (अधिकतम 15 खंड) `dist^0.75` पूर्व-प्रक्रमण सहित, वही 35% प्रणाली फ़र्श, व `l.heldLight` परिवेश-बूस्ट **पूर्व** मान है। अनुकूलित मद `spotlightRange` व शंकु कोण स्थिर कर सकते हैं — "पकड़े रहते किरण" विधा जिसकी शंकु कैमरा अनुगमन करती है। पैक किरण दिशा जान नहीं सकते।

अनुकूलित खंड `skyLightEmission` (0–15) रख सकते हैं, जो **blockLight BFS से अलग skyLight प्रणाली स्वयं अंतःक्षेपित** करता है। R9.12-ढंग पैक सूर्य/छाया skyLight देहली निर्णय कृत्रिम प्रकाशों से उठे skyLight दुनियाओं में चूक सकते हैं। वितरण पैक blockLight संयोजन निर्णय अधिक सुदृढ़ करते हैं।

## 27. पाइपलाइन विवरण

- **surface हुक alphaTest "पूर्व" चलते हैं**: `out.alpha` सीधे त्याग परीक्षण खिलाता है। कटआउट सामग्री (घास, पत्ते) dither-ढंग विलयन प्रभाव अनुमति (रेसिपी R-C)। तरलों (मिश्रण) में `out.alpha` वास्तविक पारदर्शिता है (रेसिपी R-D)। सामान्य अपारदर्शी टेरेन पर प्रभाव नहीं — भ्रमित न हों
- **`l.ambient` सामग्री** `material.ambient × sceneAmbient` है, सामग्री अनुसार भिन्न। दृश्य पक्ष ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5) बाँधता है — नियत डिफ़ॉल्ट कभी न प्रोग्राम करें
- **`time` वास्तव में `performance.now()` है**: ब्राउज़र अपटाइम 1 घंटे लिपटा हुआ। खेल दिन-रात व दुनिया बीता काल असंबद्ध। खेल घड़ी समकालिक एनिमेशन हेतु दिन-रात चक्र दुनियाओं में `sunDirection` दिगंश से काल अनुमान करें
- लोड पर खंड सीमाओं पर महीन चेकर पैटर्न इंजन परदा-अंतरिक्ष Bayer 4×4 dither खंड फ़ेड हैं, पैक बग नहीं
- **`mod` आरक्षित शब्द है**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` से अस्वीकृत। शेष `%` ऑपरेटर से लिखें

### R-C. Bayer dither विलयन — out.alpha त्याग नियंत्रित करता है

इंजन खंड फ़ेड प्रयुक्त **वही Bayer 4×4 तालिका** पुनरुत्पादित कर, निचले खंडों से cutout विलीन करता है। discard alphaTest सामग्री (घास, पत्ते) में छूटता है; तरलों में मिश्रण पारदर्शिता है।

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod आरक्षित है: `%` ऑपरेटर प्रयोग करें
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    // निचले खंडों से विलीन होता है; अधिक dissolve टिका रहता है
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(s.originOffset).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. जल निकट-कैमरा फ़ेड — तरल alpha दृष्टि स्पष्ट रखता है

तरल हुक `out.alpha` मिश्रण सीधे खिलाता है। कैमरा ठीक नीचे पृष्ठ ही पतला करके, गोता/जलोपरि कैमरा दृष्टि सुनिश्चित करने की रेसिपी।

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, s.eyePosition);
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 खंड पूर्ण पारदर्शी से सामान्य
    #endif
    return out;
}
```

## 28. पैक दृश्य मान बदलने वाली चीज़ें — परीक्षण सूची

वही पैक **दुनिया व खिलाड़ी सेटिंग अनुसार** भिन्न दिखता है। वितरण पूर्व कम से कम इन 3 परिवेशों में देखें:

1. **सामान्य दुनिया** (डिफ़ॉल्ट आकाशपेटी, ओवरराइड नहीं) — sunDirection विद्यमान, डिफ़ॉल्ट वर्ण
2. **अंतरिक्ष आकाशपेटी दुनिया** — sunDirection = 0। `sunPresent` शाखा रूप
3. **अनुकूलित दुनिया `visionMinLightColour` / `skyLightColourOverride` सहित** — उठे अंधेरे व वर्ण

मुख्य भिन्नता स्रोत: `lightingOverride` (बलात् प्रकाश) / `skyLightColourOverride`, `ambientLightColourOverride` (hex अदला-बदली) / `visionMinLightColour` ("दिखने वाला सबसे गाढ़ा वर्ण" फ़र्श sky व ambient पर; Night Vision प्रयोग करता है — "गुफा घोर अंधेरी" पैक सोचा अंधेरा नहीं करते) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (sunDirection विद्यमानता)। `uSkyLightColour` डिफ़ॉल्ट = (1,1,1) श्वेत, `uAmbientLightColour` डिफ़ॉल्ट = (0.25,0.25,0.30)। `l.ambient` दृश्य पक्ष = ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5)। `l.fogFactor` खिलाड़ी फ़ॉग/खंड दूरी सेटिंग अनुगमन करता है।

## 29. दोषमार्जन साधन

- URL प्राचल `?renderer=lite` — Lite रेंडरर बलात् (`?renderer=webgl2` / `babylon` भी चलते हैं)
- URL प्राचल `?vconsole` — परदा अंतः कंसोल (VConsole)। सचल वास्तविक-मशीन सत्यापन में काम का
- कंसोल `noa-engine v0.33.0` व `Renderer: lite from <स्रोत>` दिखाता है — रेंडर पथ अपनिदान बचने पहले इन्हें देखें
- WebGPU रेंडरर पैक सहित "बलात् चालू" तालाबंद होता है। "Disable Block Texture Atlas" सेटिंग भी तालाबंद (Atlas चालू रहता है), व WebGPU बिना परिवेश पैक बिल्कुल लागू नहीं होता। वितरण पृष्ठों पर "WebGPU ब्राउज़र आवश्यक" लिखने का आधार
- खेल प्रवेश रनटाइम पुनः सत्यापन (`checkCompilation`) ब्राउज़र WebGPU में वास्तविक टेरेन सामग्री संकलित करता है (सेटिंग परदा स्थैतिक सत्यापन से कठोर)। यहाँ गिरने वाले पैक उस खेल से वर्जित होते हैं

## 30. स्वतंत्रतः समान सामग्री विषयक

लगभग समान सामग्री वाली समुदाय सामग्री विद्यमान है: [GlitchHunterCoder/Bloxd-Essay का Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader)। इस गाइड से पहले प्रकाशित, पर **इस गाइड सामग्री glm के Bloxd वास्तविक बंडल फ़ाइलों (webpack खंड समुच्चय) के स्वतंत्र विश्लेषण से है — प्रतिलिपि नहीं**। दोनों मिलते हैं क्योंकि एक ही कार्यान्वयन की स्वतंत्र जाँच समान निष्कर्ष लाती है।

---

शोधकर्ता: ltf_ahel (glm के साथ शोधित)
