# Bloxd.io शेडर पैक बनाना (पूर्ण गाइड)

Bloxd.io शेडर पैक (केवल WebGPU रेंडरर) बनाने और वितरित करने की स्व-पर्याप्त गाइड।

> यह अनौपचारिक गाइड है और डेवलपर्स के आधिकारिक मत का प्रतिनिधित्व नहीं करती। API बिना सूचना बदला जा सकता है।  
> अंतिम समीक्षा: 2026-10-27 (v4 उत्पादन रोलआउट पुष्ट — बिल्ड `cnty9`, उत्पादन व preprod समान; भाग X देखें। बंडल तुलना से v3 उत्पादन रोलआउट की पुष्टि; हुक कॉल, फ़ॉग, गहराई व blockFlags आंतरिक विवरण उत्पादन बिल्ड से पुनः प्राप्त — भाग IX §49–§54)। संपूर्ण संदर्भ सामग्री भाग XI (`11-reference.md`) के रूप में अंतर्निहित है — शब्दशः पुनर्स्थापित इंजन हेडर और सभी 905 प्रयोज्य टेक्सचर नामों का पूर्ण मापा कैटलॉग; फिर भी रेसिपी लोडिंग स्क्रीन व इन-गेम कंपाइल से सत्यापित करते रहें।  
> शेडर पैक सुविधा स्वयं गेम UI से लोड होने वाली आधिकारिक सुविधा है, और पैक शुद्ध WGSL हैं  
> (JS निष्पादन/नेटवर्क नहीं), इसलिए सामान्य कोड से कुछ खतरनाक नहीं होता।  
> यह गाइड AI सहायता से बनाई गई है; सटीकता की गारंटी नहीं। वास्तविक इन-गेम व्यवहार से सत्यापित करें।

[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](02-api.md)

# भाग I: पैक बनाना

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

## 1. अवलोकन और पूर्वापेक्षाएँ

- शेडर पैक **केवल WebGPU रेंडरर** के लिए हैं। पैक इंस्टॉल रहने तक सेटिंग्स में WebGPU रेंडरर ज़बरन चालू रहता है
- पैक **WGSL के प्रतिबंधित सबसेट** में लिखे जाते हैं। वे केवल **टेरेन (terrain) और तरल (liquid)** के रूप को प्रभावित करते हैं
- जो कर सकते हैं: रंग, पारदर्शिता और उत्सर्जन बदलना; प्रकाश पुनर्निर्माण; प्रक्षेपण-शैली छायाएँ (R9.12); वर्टेक्स एनिमेशन (केवल कुछ खेलों में)
- जो नहीं कर सकते: अपना टेक्सचर जोड़ना, पोस्ट-प्रोसेसिंग (ब्लूम आदि), सूर्य के साथ घूमने वाली पिक्सेल-सटीक छायाएँ (शैडो मैप) व वास्तविक परावर्तन (SSR), आकाश व एंटिटी प्रभावित करना (मौजूदा ब्लॉक-टेक्सचर एटलस का **सैंपलिंग v4 से संभव है** — `bloxdTexel`, [भाग X](10-apiv4.md) §57)
- जो कर सकते हैं (पर अक्सर छूट जाता है): **`skyLight` (वोक्सेल आकाश अवरोध) से प्रक्षेपण-शैली छायाएँ** — पेड़ों व छतों के नीचे स्पष्ट अंधेरा कर सकते हैं (R9.12)। ब्लॉक तोड़ने पर LightEngine तुरंत पुनर्गणना करता है, छायाएँ रीयल-टाइम साथ चलती हैं
- **अधिकांश खेल strict मोड** में चलते हैं (वर्टेक्स एनिमेशन नहीं, `discard` नहीं)। सामान्य वितरण वाले पैक strict में चलने लायक बनाएँ

## 2. त्वरित शुरुआत

1. फ़ोल्डर बनाएँ, उसमें `pack.json` और `.wgsl` फ़ाइलें रखें
2. गेम सेटिंग्स → Shader Pack से zip या फ़ोल्डर लोड करें
3. त्रुटियाँ सुधारें और पुनः लोड करें ([भाग V](05-troubleshooting.md) देखें)
4. समर्थित खेलों में परीक्षण करें
5. पूर्ण होने पर zip करके वितरित करें

## 3. पैक संरचना

- **वितरण रूप**: एकल `.zip`, या फ़ोल्डर (फ़ोल्डर लोडिंग केवल डेस्कटॉप ब्राउज़र)
- **सामग्री**: एक `pack.json` (पैक के शीर्ष स्तर पर; केस असंवेदनशील) + 1–256 `.wgsl` फ़ाइलें
- कई `.wgsl` जोड़कर एक मॉड्यूल माने जाते हैं, अतः बँटवारा व उप-निर्देशिका-विभाजन मुक्त। फ़ाइल नाम पर कोई बंधन नहीं। जोड़ना **पथ-नाम के शब्दकोश क्रम** में होता है (मॉड्यूल-स्तरीय घोषणाएँ क्रम-निरपेक्ष हैं अतः सामान्यतः अप्रभावी, पर `var` के आरंभ-क्रम पर निर्भर लेखन में ही लागू होता है)। `.wgsl` के अतिरिक्त फ़ाइलें (README आदि) अनदेखी होती हैं
- ZIP बनाने की युक्ति: जिस zip में सभी फ़ाइलें एक ही साझा रूट फ़ोल्डर के नीचे हों, उसका उपसर्ग स्वतः हट जाता है (macOS का "फ़ोल्डर संपीड़ित करें" zip भी सीधे ठीक। `__MACOSX` / `._` से शुरू फ़ाइलें / `.DS_Store` जैसी OS-कचरा स्वतः छूटती हैं)। पर रूट स्तर पर अतिरिक्त फ़ाइलें मिलने से शीर्ष-स्तर पहचान टूटती है, अतः पक्का तरीका: फ़ोल्डर के भीतर जाकर `pack.json` व `.wgsl` सीधे चुनकर संपीड़ित करें (`pack.json` ZIP के मूल में आए, यह जाँचें)

| मद | सीमा |
|---|---|
| zip आकार / प्रविष्टि संख्या | 32MB / 1024 |
| pack.json आकार | 64KB, UTF-8 |
| .wgsl कुल आकार | 256KB, UTF-8 |
| zip प्रारूप | zip64, विभाजित व एन्क्रिप्टेड अस्वीकृत। संपीड़न केवल store / deflate, डुप्लीकेट पथ अस्वीकृत |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| फ़ील्ड | आवश्यक | विवरण |
|---|---|---|
| `apiVersion` | आवश्यक | ठीक-ठीक `3` से मेल खाना चाहिए। `1`/`2` वाले पैक लोड पर `shaderPack:loadWrongApiVersion` से अस्वीकृत होते हैं — माइग्रेशन के लिए [भाग IX](09-apiv3.md) देखें |
| `name` | आवश्यक | खाली नहीं। सेटिंग्स UI में दिखता है |
| `author` | वैकल्पिक | छोड़ा जा सकता है। गैर-स्ट्रिंग मान (संख्या आदि) त्रुटि हैं |

अन्य फ़ील्ड अनदेखे होते हैं।

## 5. न्यूनतम टेम्पलेट

केवल `pack.json` (अध्याय 4) और इस `pack.wgsl` से चलने वाला पैक:

```wgsl
// हल्के गर्म रंग का न्यूनतम पैक
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

पालन योग्य नियम:

- आउटपुट संरचनाएँ **कभी सीधे न बनाएँ** (`BloxdSurface(...)` त्रुटि है)। हमेशा `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` से शुरू करके फ़ील्ड बदलें। अपवाद: light हुक प्रथम प्राचल (`s: BloxdSurface`) निर्गम समरूप अतः `var out = s;` से आरंभ भी योग्य
- हुक पैरामीटर **केवल-पठन** हैं। बदलने के लिए पहले कॉपी करें, जैसे `var sv = s;`
- अपने पहचानकर्ताओं में `bloxd_` उपसर्ग प्रयोग न करें (6 हुक नामों को छोड़कर)। परिभाषित केवल 6 हुक नाम कर सकते
- अनारंभिक `var x: BloxdSurface;` (केवल प्रकार टिप्पणी) भी त्रुटि है
- स्थिरांक `const` से लिखें (`#define` में मान नहीं लिख सकते)

## 6. छह हुक

सभी वैकल्पिक। हस्ताक्षर प्रकारों में ठीक-ठीक मिलने चाहिए (पैरामीटर नाम स्वतंत्र)।

| हुक | भूमिका |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | टेरेन वर्टेक्स एनिमेशन। **strict में अनुपलब्ध** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | टेरेन रंग, पारदर्शिता, उत्सर्जन। `s.colour` = टेक्सचर × वर्टेक्स रंग |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | टेरेन अंतिम रंग। फ्रैगमेंट के **अंतिम चरण** में बुलाया जाता है, वापसी मान ज्यों का त्यों अंतिम रंग बनता है |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (सम रूप) | तरल संस्करण। `alpha` तरल पारदर्शिता के रूप में काम करता है |

फॉलबैक नियम:

- तरल हुक अपरिभाषित हो तो **उसी नाम का टेरेन हुक प्रयुक्त** होता है (विपरीत नहीं)। केवल surface लिखने से तरल पर भी वही प्रभाव लगता है
- light हुक अपरिभाषित हो तो डिफ़ॉल्ट व्यवहार (`engineColour + emission × fogVisibility`)
- `engineColour` त्यागकर आधार रंग से पुनर्निर्माण करें तो स्वयं फ़ॉग दोबारा लगाएँ: `mix(l.fogColour, col, l.fogVisibility)`। emission जोड़ते समय पहले `fogVisibility` से गुणा करें

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
- निर्देशांक noa-स्थानीय हैं। विश्व निर्देशांक हेतु `bloxdOriginOffset()` जोड़ें। ब्लॉक निर्देशांक = `bloxdFaceBlock(position, normal)`

## 9. सत्यापन, परीक्षण व वितरण

लोड होने पर गेम पक्ष में इस क्रम से जाँच होती है:

1. लोडर सीमा जाँच (अध्याय 3 की सीमाएँ)
2. स्थैतिक कंपाइल (सभी 8 वेरिएंट)
3. ब्राउज़र WebGPU द्वारा वास्तविक कंपाइल सत्यापन (स्थैतिक सत्यापन टाइप जाँच में अपूर्ण है, इसलिए यहाँ गिरने वाला कोड है। अध्याय 8 के जाल से बचें)

क्रम:

1. सेटिंग → Shader Pack से zip / फ़ोल्डर पढ़ें
2. स्थिति जाँचें। चुनते ही "Ready. Reload the page to use it." दिखता है; पेज पुनः लोड करने पर "Ready to use" आए तो सफल। "Saved, but it won't run until you fix these errors..." हो तो त्रुटि सूची (फ़ाइल:पंक्ति + वेरिएंट) सुधारकर पुनः लोड करें
3. लोड के बाद पेज पुनः लोड करने पर सक्रिय होता है। URL पैरामीटर या localStorage में रेंडरर ओवरराइड बचा हो तो पैक का चालू होना अस्वीकृत होता है, अतः उन्हें हटाकर पुनः लोड करें
4. पहले ढीले खेलों में जाँचें, फिर strict खेलों (अधिकांश यही) में जाँचें। वर्टेक्स एनिमेशन वाले केवल allow खेलों में काम करते हैं
5. वितरण के समय `pack.json` मूल में रखकर ZIP बनाएँ (अध्याय 3 की आकार-सीमा के भीतर)। पैक बदलना उसी स्क्रीन से पुनः लोड किया जा सकता है, पर असर हेतु पेज पुनः लोड आवश्यक है (चरण 2-3)। हटाना Remove Pack से। खेल अपडेट के बाद पुनः सत्यापन पेज लोड पर स्वतः होता है

[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](02-api.md)

[← पिछला भाग](01-making.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](03-recipes.md)

# भाग II: API संदर्भ

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

## 10. इंजन शीर्षक (पैक कोड के आगे स्वतः जुड़ने वाला कोड)

नीचे कोड इंजन पैक कोड के आगे स्वतः डालता है (पैक पुनः घोषित नहीं कर सकते)। `#ifdef` में लिपटे भाग वेरिएंट अनुसार बदलते हैं।

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

मुख्य बिंदु:

- `bloxdTime()` हर 3600 सेकंड लपेटने वाला बीता समय है (`bloxdTimeWrap`)। खेल की दिन-रात घड़ी से समन्वय की गारंटी नहीं। bind group चरण दृश्यता VERTEX|FRAGMENT होने से **vertex हुकों से भी बुलाया जा सकता है**
- `bloxdSunDirection()` सूर्य के होने पर इकाई वेक्टर है, आकाश में सूर्य न हो तो शून्य। **चंद्रमा सदा `-bloxdSunDirection()` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। वर्तमान बिल्ड में दिन-रात चक्र का कार्यान्वयन नहीं है; सूर्य, चंद्रमा व तारे खेल चलते समय नहीं घूमते (दृश्य ON/OFF केवल `dayNightSunOpacity` आदि अपारदर्शिता सेटिंग से)। डिफ़ॉल्ट पृथ्वी आकाश में सूर्य लगभग `(−0.56, 0.81, −0.18)` (ऊँचाई लगभग 54°) पर स्थिर रहता है। **शून्य वेक्टर `normalize` को न दें** — `dot(d, d) < 1e-8` से सूर्य की अनुपस्थिति जाँचकर स्थिर दिशा पर फ़ॉलबैक करना सुरक्षित है ([भाग VII](07-internals.md) §28 देखें)
- ※टिप्पणी: पहले "शून्य पर चंद्र दिशा पुनःप्रयोग असंभव" लिखा था। दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध है, पर वितरण पैक शून्य आधार मानकर `sunPresent` शाखा प्रयोग करें (नीला परिवेश छद्म हेतु R2, दिशात्मक चांदनी हेतु [भाग VII](07-internals.md) R-A देखें)
- `emission` प्रकाश गणना के बाद जुड़ता है, **`fogVisibility` से क्षीण होकर** (defaultLight कार्यान्वयन `engineColour + emission × fogVisibility`। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है)
- **फ़ॉग प्रयोग क्रम**: फ्रैगमेंट भीतर प्रक्रिया क्रम ① प्रकाश·उत्सर्जन संश्लेषण → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light हुक आह्वान → ⑤ वापसी। अतः **engineColour फ़ॉग लगा हुआ आता है**, **light हुक वापसी मान ज्यों का त्यों अंतिम रंग** (हुक बाद फ़ॉग पुनः नहीं लगता)
- **fogVisibility परिभाषा स्रोत**: दृश्य-अंतरिक्ष दूरी (शीर्ष इकाई संगणित·अंतर्वेशित)। linear विधा में `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 पर**: `fogColour` `vec3f(0.0)` (काला) होकर आता है। fogColour रंगत से समय अनुमान कोड सावधान रहे
- **वर्तमान बिल्ड की वास्तविक फ़ॉग सेटिंग**: **linear स्थिर**। `fogStart` = आरेखन चंक दूरी, `fogEnd` = +1 चंक (केवल क्षितिज)। फ़ॉग-बंद सेटिंग में 100 / 101 चंक पर सेट होकर व्यावहारिक रूप से अमान्य। डिफ़ॉल्ट फ़ॉग वर्ण RGB (183, 191, 195) है।
- **`skyLight` / `blockLight` / `heldLight` "लिफ्ट वक्र" पार करने के बाद का मान** आते हैं। हेडर टिप्पणी का `tone-mapped` यही कहता है: इंजन फ़्रैगमेंट पर अनिवार्यतः `y = 1-(1-x/(3-2x))³` (गाढ़े हिस्से उठाने वाला S-वक्र) लगाकर पैक को देता है। कच्चा voxel मान (n/15) नहीं — जैसे पेड़ के नीचे (कच्चा 0.87) **0.97 तक उठकर** आता है। सहज ग्रेडेशन हेतु वैसा ही ठीक, पर **देहली से धूप/छाया अलग करनी हो तो व्युत्क्रम `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` से कच्चा मान पुनः प्राप्त करें** (R9.12)।
- `skyLight` का वास्तविक अर्थ "उस स्थान से आकाश दिखता है या नहीं" का voxel अवरोध डेटा (= छाया-मैप) है, केवल चमक पैरामीटर नहीं (अध्याय 15 "छाया का सत्य")।
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B) **केवल हेडर फ़ंक्शनों से प्रयोग करें**। पैक से सीधा संदर्भ न दें। stage दृश्यता VERTEX|FRAGMENT है, अतः हेडर फ़ंक्शन हुक के बाहर मॉड्यूल-स्तरीय फ़ंक्शन व vertex हुक से भी बुलाए जा सकते हैं। गहराई टेक्सचर (binding 1) केवल FRAGMENT का है, अतः `bloxdOpaqueBehind()` surface / light हुक तक सीमित है।
- **`litColour` आरंभ बिंदु प्रयोज्य है**: v1 में केवल फ़ॉग लगा `engineColour` था, अतः स्वनिर्मित वातावरण अभिव्यक्ति में द्वि-फ़ॉग हो जाता था। v2 में फ़ॉग-पूर्व व उत्सर्जन-पूर्व `litColour` से आरंभ कर `bloxdApplyFog()` से अपनी गति से फ़ॉग दोबारा लगाएँ
- **`blockId` से खंड प्रकार पहचाने जा सकते हैं**: टेक्सचर वर्ण अनाश्रित पहचान। पर ID-खंड-प्रकार संगति तालिका इंजन भीतर होने से कौन ID कौन खंड दुनिया में मापें; तैयार तालिका [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) में है ([भाग VIII](08-apiv2.md) देखें)
- **संरचना सीधा निर्माण निषिद्ध**: `BloxdLight(...)` जैसे निर्माता आह्वान स्थैतिक सत्यापन में अस्वीकृत होते हैं। सदा `bloxdDefault*` से बदलें या निवेश प्रतिलिपि प्रयोग करें

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

शीर्ष संरचना आकार भी वेरिएंट अनुसार बदलते हैं (strict में `BloxdVertex` स्वयं नहीं, अलिट में `blockLight` आदि नहीं, strict टेरेन में `alpha` नहीं)।

परिभाषित प्रतीक आधिकारिक रूप से 4 हैं (ऊपर की तालिका के 3 + `BLOXD_SCENE_DEPTH` — [भाग VIII](08-apiv2.md) §35)। टेरेन / तरल का अंतर प्रतीक नहीं बल्कि **अलग प्रोग्राम** है, अतः `#ifdef BLOXD_TERRAIN` जैसी शाखा नहीं लिखी जा सकती। फ़्लैग नामों का मिलान अक्षर-भेद नहीं करता। `#ifdef` में गलत नाम लिखने पर त्रुटि पाठ 4 आधिकारिक नामों की सूची दिखाता है। हुक फ़ंक्शन केवल टेरेन व तरल — इन 2 प्रोग्रामों में ही डाले जाते हैं; पैक इकाई या कण आदि अन्य रेंडरिंग को प्रभावित नहीं कर सकते।

## 12. कंकाल चीटशीट

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // सीधा निर्माण निषिद्ध। हमेशा default से
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // टेरेन में केवल allow पर alpha है
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // प्रकाश-केवल निवेश सुरक्षित करें
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex अवश्य इस गार्ड सहित
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

हमेशा ध्यान रखने योग्य 5 बातें: सभी 8 वेरिएंट में साफ कंपाइल / strict खेल बहुमत / टेक्सचर नहीं / हुक पैरामीटर केवल-पठन / मॉड्यूल-स्कोप में `let` नहीं।

[← पिछला भाग](01-making.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](03-recipes.md)

[← पिछला भाग](02-api.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](04-realism.md)

# भाग III: रेसिपी संग्रह

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

- [R1. रंग रेसिपी (surface)](#r1-रंग-रेसिपी-surface)
- [R2. प्रकाश रेसिपी (light)](#r2-प्रकाश-रेसिपी-light)
- [R3. उत्सर्जन रेसिपी (emission)](#r3-उत्सर्जन-रेसिपी-emission)
- [R4. निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)](#r4-निर्देशांक-रेसिपी-विश्वब्लॉकदृष्टि)
- [R5. काल रेसिपी (एनिमेशन)](#r5-काल-रेसिपी-एनिमेशन)
- [R6. तरल रेसिपी](#r6-तरल-रेसिपी)
- [R7. वर्टेक्स रेसिपी (केवल allow)](#r7-वर्टेक्स-रेसिपी-केवल-allow)
- [R8. गणित छोटी युक्ति संग्रह](#r8-गणित-छोटी-युक्ति-संग्रह)
- [R9. यथार्थवादी रेसिपी](#r9-यथार्थवादी-रेसिपी)

---

सभी टुकड़े 8 वेरिएंट पास की शर्त वाली गार्ड सहित लिखे हैं, ज्यों का त्यों कॉपी कर स्थिरांक बदलने भर से प्रयोज्य हैं। पर नीचे रेसिपी अलग-अलग उदाहरण हैं, ऊपर से सब जोड़ने के काम की नहीं — एक ही हुक नाम (`bloxdTerrainLight` आदि) या एक ही सहायक फ़ंक्शन नाम कई चिपकाने से एक ही मॉड्यूल में परिभाषा दुहराकर कंपाइल विफल करता है। कई प्रभाव साथ प्रयोग करें तो हुकों को प्रकार अनुसार 1 में समेटकर उस फ़ंक्शन में एकीकृत करें।

## R1. रंग रेसिपी (surface)

### एकल रंगत (सबसे बुनियादी)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // ऊँचाई 0..50 पर 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### फलक अभिविन्यास से रंगना (ऊपर=उजला, दीवार=गाढ़ा)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ब्लॉक से 192 ब्लॉक पर 0..0.35 स्वनिर्मित फ़ॉग जोड़ना
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### रात (skyLight नीला झुकाव + दीया रक्षा)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> इस API में सूर्यहीन आकाश का `bloxdSunDirection()` शून्य है। नीचे दिशात्मक चांदनी नहीं, मात्र अंधेरे आकाश में क्षीण नीला परिवेश। चंद्र दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](07-internals.md) R-A)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // क्षितिज 1 / ठीक ऊपर 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### इंजन निर्गम पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) सीधा निर्माण निषिद्ध। default से बनाकर colour बदलें
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (इंजन प्रकाश परिणाम) त्यागकर 「सामग्री रंग × स्वयं संगणित चमक」 रखें
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour छोड़ा, अतः फ़ॉग पुनः लगाएँ (आवश्यक)
    out.colour = col + s.emission * l.fogVisibility;   // emission भी स्वयं जोड़ें (आवश्यक)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. उत्सर्जन रेसिपी (emission)

> `emission` प्रकाश गणना बाद जुड़ता है, पर डिफ़ॉल्ट प्रक्रिया **`fogVisibility` से क्षीण करती है। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है। दूर भी चमकाने घटक emission में न जोड़ें, light हुक भीतर `out.colour += ...` सीधे जोड़ें** (engineColour फ़ॉग लगा हुआ अतः दूर धुंध वर्ण ऊपर प्रकाश चढ़ता है)

### दीया स्पंदन (मशाल श्वास)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### प्रदीप्त अयस्क भाव (उजली सामग्री चमके)

```wgsl
// surface पक्ष: सामग्री जितनी उजली (श्वेत) emission उतना चढ़ाएँ
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### जुगनू समूह भाव (काल से अंतरिक्ष तैरते प्रकाश बिंदु)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // कुछ 「प्रकाश गोल」 धीमे तैरते हैं। दूरी व्युत्क्रम से चमकाएँ
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)

### विश्व निर्देशांक

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### ब्लॉक निर्देशांक (आधिकारिक रेसिपी — शीर्ष टिप्पणी उद्गम)

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
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
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### दृष्टि कोण (फ्रेनेल भाव — तरल हेतु)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // ठीक ऊपर से 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. काल रेसिपी (एनिमेशन)

> `bloxdTime()` हर 3600 सेकंड (1 घंटा) लपेटता है। शेडर बीता काल है, खेल के सूर्य·दिन-रात समन्वय की गारंटी नहीं। दिखावटी आवर्त एनिमेशन प्रयोज्य, वास्तविक रात निर्णय में `bloxdSunDirection()` व प्रकाश निवेश को प्राथमिकता दें।

### दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 एक घंटा आवर्त। खेल के दिन-रात समन्वय की गारंटी नहीं
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
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid सदा BLOXD_ALPHA — गार्ड आदतन
    #endif
    return out;
}
```

### ऊँचाई छद्म पारदर्शिता (सच्चा छिछला निर्णय नहीं)

> v1 में दृश्य गहराई व जलतल स्थिति संदर्भ असंभव था, अतः इस API भर से वास्तविक जल गहराई परिकलित नहीं हो सकती थी। v2 में तरल सीमित `bloxdOpaqueBehind()` से पीछे अपारदर्शी फलक तक मोटाई मापी जा सकती है ([भाग VIII](08-apiv2.md) R-E)। नीचे इसका प्रयोग न करने वाला पुराना छद्म प्रदर्शन है, `s.position.y` स्थानीय निर्देशांक, अतः ज्यों का त्यों प्रयोग से खंड मूल विचलन से प्रभाव हटता है। विश्व ऊँचाई प्रयोग करनी हो तो `bloxdWorldPosition()` से रूपांतरित करें। नीचे केवल विश्व ऊँचाई से alpha बदलने का छद्म प्रदर्शन, तटरेखा व जलतल अनुरूप छिछला अभिव्यक्ति नहीं। `packWaterReferenceY` विश्व ऊँचाई अनुरूप समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
> सटीक शर्तों (allow शीर्षक सूची; Custom Games strict है) के लिए §30 देखें: [§30 गेम-अनुसार अनुप्रयोग मोड](07-internals.md#30-गेम-अनुसार-अनुप्रयोग-मोड-shaderpackpolicy)

### घास पवन दोलन (शीर्ष ही हिलाएँ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // लंब फलक ही
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### द्रव पृष्ठ तरंग (शीर्ष फलक ही)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### स्पंदित टेरेन

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // अभिलंब दिशा में हल्का फैलाव-सिकुड़न
    return out;
}
#endif
```

### लहराता टेरेन (विशाल sin तरंग)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // फ़ॉग पुनः लगाएँ
    out.colour = col + s.emission * l.fogVisibility;                 // emission पुनः जोड़ें
    #endif
    return out;
}
```

### R9.2 सूर्य स्पेक्युलर (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // किनारे की हल्की चमक
    #endif
    return out;
}
```

### R9.4 अर्धगोल परिवेश (ऊपर=आकाश / नीचे=भूमि उछाल)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // नीचे: उछाल
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // फ़ॉग पुनः लगाएँ
    out.colour = col + s.emission * l.fogVisibility;                        // emission पुनः जोड़ें
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = अनावृति
    return out;
}
```

### R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी से संतृप्ति गिरने की 「हवा भावना」)

> ध्यान: धुंध वर्ण पर चमक बढ़ाने वाली प्रक्रिया (`normalize` आदि) लगाने से गाढ़े दृश्य में "चमकीली श्वेत धुंध" तैरती है,  
> और engineColour (फ़ॉग-युक्त) में फिर धुंध वर्ण जोड़ने से दोहरा फ़ॉग श्वेत कर देता है। **वायु भावना केवल संतृप्ति घटाकर** दिखाना सुरक्षित है।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ब्लॉक भीतर स्थानीय निर्देशांक
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> `l.fogVisibility` को `max(l.fogVisibility, 0.25)` निम्नसीमा सहित प्रयोग से "इससे सघन नहीं" समायोजन बनता है  
> (0.0 = इंजन अनुरूप / 0.3–0.5 = दूर स्पष्ट)।  
> ध्यान रहे इंजन फ़ॉग क्षितिज समर्पित linear फ़ॉग (आरेखन दूरी समीप ही) है, मध्य दूरी धुंध पैक पक्ष बनाएँ।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन मिलान अद्यतित): linear स्थिर / `fogStart` = आरेखन खंड दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद सेटिंग में 100–101 खंड व्यावहारिक अमान्य / डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // फ़ॉग पुनरुत्पादन (0.15=हल्की निम्नसीमा)
    col += s.emission * l.fogVisibility;            // emission भी फ़ॉग सहित
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 सिनेमा-ग्रेड (छाया शीत / हाइलाइट उष्ण / रात विसंतृप्त)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. कच्चा मान पुनः प्राप्त (छूटा तो कभी छाया नहीं)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. देहली कट — धूप=1 / छाया=0 निश्चयपूर्वक पृथक् करें
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // सूर्य Lambert (सूर्य न होने पर l.directional पर फॉलबैक)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission भी न भूलें (फ़ॉग-युक्त में जोड़ें)
    #endif
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल `shTh` ही निर्धारित** — `0.93`=त्रिज्या1.5 ऊपर / `0.87`=त्रिज्या2 / `0.80`=त्रिज्या3 / `0.67`=त्रिज्या5।  
> छाया किनारा कठोरता `shSoft` (0.02=कठोर / 0.08=कोमल)। छाया क्रोड अंधेरा `0.09` (न्यूनतम परिवेश) व `0.16` (आकाश प्रकीर्ण प्रकाश)  
> 2-बिंदु स्थानांतरण से तय होता है। संध्या में छाया फैलानी हो तो  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी संध्या छाया सन्निकटन।  
> `sunDir` यानी `bloxdSunDirection() / length(bloxdSunDirection())`)। छाया नीलापन हेतु `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।

[← पिछला भाग](02-api.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](04-realism.md)

[← पिछला भाग](03-recipes.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](05-troubleshooting.md)

# भाग IV: यथार्थवाद गाइड

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

## 13. इंजन डिफ़ॉल्ट प्रकाश व यथार्थ गुंजाइश

इंजन डिफ़ॉल्ट प्रकाश केवल "गुणन" है, स्पेक्युलर, फ्रेनेल, उष्ण-शीत पृथक्करण, अर्धगोल परिवेश मौजूद नहीं। पुनर्निर्माण योग्य सीमा:

| कार्य | डिफ़ॉल्ट | पैक में संभव? |
|---|---|---|
| विसरित (Lambert) | केवल दिशात्मक अदिश योग | ◎ `bloxdSunDirection()` से स्वयं कार्यान्वित (आवरण स्रोत आदि) |
| स्पेक्युलर (दर्पण परावर्तन) | कुछ नहीं | ◎ Blinn-Phong (R9.2) |
| फ्रेनेल | कुछ नहीं | ◎ Schlick सन्निकटन (R9.3) |
| उष्ण मशाल / शीत आकाशप्रकाश पृथक्करण | अवर्ण | ◎ (R9.1) |
| अर्धगोल परिवेश | अदिश | ◎ ऊपर=आकाश वर्ण / नीचे=भूमि प्रतिक्षेप (R9.4) |
| तान मानचित्रण | नहीं (केवल clamp) | ◎ ACES फ़िल्मिक (R9.5) |
| वायुमंडलीय परिप्रेक्ष्य | केवल फ़ॉग (रंग प्रतिस्थापन) | ◎ दूरी विसंतृप्ति (R9.6) |
| पृष्ठ विवरण | केवल टेक्सचर विभेदन | △ हैश शोर प्रक्रियात्मक सूक्ष्म उभार (R9.8) |
| शीर्ष तरंग (जलपृष्ठ) | कुछ नहीं (समतल) | ◎ केवल allow (R7) |
| तरंग अभिलंब / सूर्य चमक | कुछ नहीं | ◎ (R9.7) |
| रात्रि चंद्रप्रकाश निरूपण | केवल आकाशवर्ण अंधेरा | △ चंद्र दिशा `-bloxdSunDirection()` में: छद्म अभिव्यक्ति (R2 नीला परिवेश / R9.11) संग दिशात्मक चांदनी (R-A, केवल दिन-रात चक्र) |
| छाया (आकाश अवरोध) | केवल `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` हल्का मिश्रण | ◎ लिफ्ट व्युत्क्रम + देहली कट + सूर्य गेट (R9.12)। वृक्ष छाया, छज्जा नीचे स्पष्ट अवनमन, ब्लॉक संपादन वास्तविक-समय अनुगमन |

## 14. यथार्थवाद कार्यान्वयन पंथ —— दो

**पंथ A: योगात्मक संशोधन (defaultLight आरंभ)** —— `engineColour` (पूर्ण रंग) आधार मान, उष्ण दीप्ति व रिम प्रकाश जोड़ें। हल्का व सुरक्षित, पर प्रकाश प्रतिरूप डिफ़ॉल्ट ही रहता है।

**पंथ B: पूर्ण पुनःप्रकाशन (s.colour आरंभ)** —— `l.engineColour` त्यागकर, `s.colour` (एल्बिडो) व LightIn कच्ची सामग्री से प्रकाश पुनर्गठित करें। यथार्थवाद का प्रामाणिक मार्ग। 4 नियम मानें:

1. **फ़ॉग पुनः लगाएँ**: light हुक फ़ॉग के बाद चलता है, स्वयं `mix(l.fogColour, col, l.fogVisibility)` लगाएँ (R9.10)। घने फ़ॉग में `max(l.fogVisibility, 0.3)` निम्नसीमा रखें। उल्टा engineColour-आधारित पैकों में और फ़ॉग रंग मिलाने से श्वेत द्वि-फ़ॉग बनता है
2. **अप्रकाशित वेरिएंट वापसी**: `#ifdef BLOXD_LIGHTING` के बाहर सीधे `defaultLight` लौटाएँ
3. **साझा फ़ंक्शन समग्र रक्षा**: `BloxdLightIn` पैरामीटर वाले साझा फ़ंक्शन पूरे fn सहित `#ifdef BLOXD_LIGHTING` में लपेटें (केवल कॉल-स्थल अपर्याप्त)
4. **सूर्य दिशा अनुपस्थिति पर**: `bloxdSunDirection()` शून्य हो तो दिशात्मक स्पेक्युलर न गिनें। `l.directional` प्रकाश-मात्रा अदिश है, दिशा सदिश नहीं; झलक दिशा पुनः प्राप्त नहीं होती। आवश्यक हो तो अदिशात्मक मंद परिवेश पर जाएँ। चंद्र दिशा `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाओं में गतिशील। [भाग VII](07-internals.md) R-A)

## 15. अप्राप्य रूप (यथार्थवाद की "छत")

| रूप | कारण |
|---|---|
| पिक्सेल-सटीक छाया मानचित्र (सूर्य संग घूमती छाया, उपच्छाया) | गहराई टेक्सचर संदर्भ असंभव (तरल सीमित `bloxdOpaqueBehind()` केवल ज्यामिति सूचना, शैडो मानचित्र में अप्रयोज्य)। किरण अवरोध निर्णय हुकों में निवेश नहीं |
| SSAO | दृश्य गहराई अगम्य (केवल जाल सेकी वर्टेक्स AO। तरल सीमित गहराई SSAO में अप्रयोज्य) |
| SSR (परावर्तन) | दृश्य वर्ण अप्राप्य। केवल फ्रेनेल मिश्रित आकाश वर्ण छद्म |
| ब्लूम / चकाचौंध | पश्च-प्रक्रमण में हुक नहीं |
| क्षेत्र गहराई, वर्ण विपथन, दाना | पूर्ण-परदा पश्च-प्रक्रमण आवश्यक |
| आयतन प्रकाश (god rays) | वही |
| PBR टेक्सचर | टेक्सचर पठन निषिद्ध। केवल वर्ण चमक छद्म अनुमान |
| जलांत अपवर्तन | दृश्य वर्ण अप्राप्य। तरल सीमित गहराई (`bloxdOpaqueBehind()`) से मोटाई अवशोषण व तल प्रक्षेपण संभव ([भाग VIII](08-apiv2.md) R-E) |
| जलांत आवरण (नीला रंगत) हटाव / बदलाव | आवरण "कैमरा तरल खंड परिभाषा color/alpha" जनित emissive पूर्ण-परदा quad है, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित, अतः पैक न वर्ण न सघनता बदल सकता |
| जलांत सीधा संसूचन | कैमरा निमज्जन दर्शाने वाला निवेश नहीं, जलांत में fogStart / fogEnd / fogColour अपरिवर्तित अतः fogVisibility आदि से अनुमान की विश्वसनीय विधि भी नहीं |

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

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogVisibility भी संसूचित नहीं करता)।

## 16. दोषमार्जन युक्तियाँ

- गुफा अधिक उजली → `skyLight` अरैखिक वक्र अभाव (R2 गुफा रेसिपी / R9.9)
- दिन अधिक अनावृत → ACES पूर्व अनावृति घटाएँ
- रात अदृश्य अंधेरी → न्यून परिवेश सुनिश्चित करें (रात्रि `skyLightColour` आधारतः निकट-काला)
- दूर धुंध अधिक → वायुमंडल गुणांक घटाएँ
- मशाल चारों ओर नारंगी → उष्ण मिश्रण अनुपात घटाएँ (कच्चा रंजित प्रकाश अंश रखें)
- खंड लगभग पूर्णतः श्वेत → light हुक निर्गम योग 1.0 अधिक (अनुप्रवाह clamp नहीं)। अंत में `clamp(col, vec3f(0.0), vec3f(1.0))` लगाएँ
- योग बिना श्वेत → fogVisibility विभाजन un-fog व्युत्क्रमण कारण। un-fog हटाएँ; पुनर्निर्माण `s.colour` आधार, फ़ॉग अंत में एक बार `mix`
- उत्सर्जक खंड नहीं चमकते → पुनर्निर्माण क्रम में emission पुनर्योग चूक। `+ s.emission * l.fogVisibility` जोड़ें
- रात केवल प्रदीप्त फलक शेष → केवल छाया न दबाएँ, पूर्ण रंग (`engineColour`) समग्र रात्रि क्षय लगाएँ। स्थानीय दीये रखें तो `blockLight` / `heldLight` से क्षय घटाएँ (छठा भाग 19)
- `pow(skyLight, γ)` कितना भी छाया सघन नहीं → `l.skyLight` लिफ्ट बाद मान (अध्याय 10)। R9.12 व्युत्क्रम + देहली कट पर जाएँ
- छाया क्षेत्र/सघनता समायोजन चाहिए → R9.12 समायोजन मार्ग देखें (क्षेत्र=देहली `shTh` / किनारा=`shSoft` / छाया क्रोड अंधेरा=न्यून परिवेश व आकाश प्रकीर्ण प्रकाश दो-बिंदु विचलन)

[← पिछला भाग](03-recipes.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](05-troubleshooting.md)

[← पिछला भाग](04-realism.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](06-implementation.md)

# भाग V: समस्या-निवारण व टिप्पणियाँ

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

## 17. सामान्य त्रुटि व सुधार

| लक्षण | सुधार |
|---|---|
| strict खेल लोड नहीं | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `.alpha` अपरिभाषित कथित | `#ifdef BLOXD_ALPHA` में लपेटें |
| `blockLight` अपरिभाषित कथित | `#ifdef BLOXD_LIGHTING` में लपेटें। साझा सहायक फ़ंक्शन **समग्र फ़ंक्शन** लपेटें (v2 में फ़ील्ड सर्वदा होने से सामान्यतः नहीं होता। निर्णय प्रयोजन रक्षक रखें) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` से आरंभ बदलें |
| `pack.json needs "apiVersion": 3.` | `apiVersion` अभाव या `3` नहीं। अंक `3` पूरें (स्ट्रिंग `"3"` अस्वीकृत)। v1/v2 पैक `shaderPack:loadWrongApiVersion` से अस्वीकृत होते हैं |
| `There's no pack.json at the top of the pack.` | ZIP मूल में `pack.json` नहीं। फ़ोल्डर समग्र संवेष्टित जाँचें |
| `bloxdTerrainVertex must be declared as: fn ...` | हस्ताक्षर भिन्न। दर्शित घोषणा अक्षरशः पुनः लिखें |
| `bloxdTerrainVertex can't run in strict games...` | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` में लपेटें (v2 में फ़ील्ड सर्वदा होने से सामान्यतः नहीं होता) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` में लपेटें |
| `pow(l.skyLight, γ)` कितना भी छाया सघन नहीं | `skyLight` लिफ्ट वक्र बाद मान (कच्चा 0.87 से 0.97 आगमन)। R9.12 लिफ्ट व्युत्क्रम + देहली कट पर जाएँ (अध्याय 10) |
| `... can only be a function's parameter or return type, ...` | अनारंभिक `var x: BloxdSurface;` अस्वीकृत। `bloxdDefault*` से बनाएँ |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform पैक से सीधा संदर्भ असंभव। `bloxdTime()` आदि शीर्ष फ़ंक्शन से प्रयोग करें |
| `Packs can't declare bloxd_ names...` | अपने पहचानकर्ताओं से `bloxd_` उपसर्ग हटाएँ। केवल 6 हुक नाम परिभाषित कर सकते |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` आदि से आरंभ बदलें। light हुक प्रथम प्राचल प्रतिलिपि (`var out = s;`) से आरंभ भी योग्य |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` असंभव। `_ = f();` लिखें |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | टेरेन हुक भीतर `bloxdOpaqueBehind()` आह्वान `#ifdef BLOXD_SCENE_DEPTH` से लपेटें |
| `...only surface and light hooks can use.` | vertex हुक भीतर `bloxdOpaqueBehind()` हटाएँ (केवल surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | गहराई पठन ([भाग VIII](08-apiv2.md) §35) करने वाला पैक सक्रिय होने पर पेज पुनः लोड करके खोलें। गहराई टेक्सचर की तैयारी पेज निर्माण के समय तय होती है |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | त्रुटि नहीं, strict खेलों में स्वतः अक्षमता (`shaderPack:offInStrict`)। vertex हुक व `discard` `#ifndef BLOXD_STRICT` से लपेटें |
| `mixing '*' and '^' requires parenthesis (only in ...)` | दूसरा चरण (ब्राउज़र Tint) त्रुटि। `^` `&` `\|` `<<` `>>` के संक्रियांड कोष्ठकबद्ध करें (§38) |
| `loadDuplicateManifest` (zip पठन में) | `pack.json` 2 हैं (अक्षर-भेद सहित)। 1 करें |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL का `?renderer=` और localStorage का `bloxdRenderer` हटाकर पुनः लोड करें ([भाग VII](07-internals.md) §29) |
| दूर श्वेत धुंधला | बहुधा द्वि-फ़ॉग। पूर्ण रंग फ़ॉग लगा हुआ, स्वनिर्मित संयत रखें, संतृप्ति ही घटाना श्रेष्ठ |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | घने क्षेत्र या क्षेत्र-सीमा पार करते समय प्रकाश-स्रोतों की seed क्यू ओवरफ़्लो हो जाती है और उस चंक की लाइट गणना बीच में रोक दी जाती है। यह पैक से नहीं आता, पर **प्रकाश-स्रोतों के केंद्रीकरण पर लाइट की कमी इसी व्यवस्था** का परिणाम है; दुनिया में प्रकाश-स्रोत बिखेरकर इससे बचा जा सकता है |
| खेल प्रवेश पर पैक निष्कासित | खेल आरंभ वास्तविक-मशीन जाँच विफल। रक्षक चूक पुनः देखें |
| वास्तविक-मशीन जाँच पूरी न होकर `This device couldn't check …` आदि से पैक हट जाता है | जाँच का 60 सेकंड का अनिवार्य टाइमआउट है (अधिक समय `skipped` माना जाता है)। कम क्षमता वाले डिवाइस या भारी दुनिया में आम; भारी vertex प्रोसेसिंग व जटिल लूप कम करके पुनः प्रयास करें |

### लोडर-चरण त्रुटि ID सूची

सेटिंग्स स्क्रीन की त्रुटियों में `shaderPack:load*` ID जुड़ा होता है। पाठ खोज में सहायता हेतु:

| ID | अर्थ |
|---|---|
| `loadZipTooBig` | zip 32MB से अधिक |
| `loadTooManyZipEntries` | zip एंट्री 1024 से अधिक |
| `loadTooManyWgsl` | `.wgsl` 256 से अधिक |
| `loadSourceTooBig` | `.wgsl` कुल 256KB से अधिक (प्रति-फ़ाइल स्ट्रीमिंग जाँच) |
| `loadManifestTooBig` | `pack.json` 64KB से अधिक |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` JSON नहीं / ऑब्जेक्ट प्रकार नहीं |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` नहीं / `3` नहीं (v1/v2 अस्वीकृत) |
| `loadNoName` / `loadAuthorNotString` | `name` नहीं / `author` स्ट्रिंग नहीं |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | असमर्थित संपीड़न / zip64 / विभाजित / एन्क्रिप्टेड |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | पथ द्वैत / UTF-8 नहीं / विस्तार विफल / zip क्षति |

`loadNoManifest` / `loadDuplicateManifest` (pack.json की स्थिति / द्वैत) के लिए ऊपर की तालिका की संबंधित पंक्ति देखें।

## 18. अधिकार व टिप्पण

- शेडर पैक कार्य स्वयं खेल UI से लोड होने वाली आधिकारिक कार्य है, पैक निर्माण अपेक्षित व्यवहार मान्य है। पर सार्वजनिक आधिकारिक दस्तावेज़ अपुष्ट है
- पैक शुद्ध WGSL है, JS निष्पादन व जाल अभिगम रचनातः असंभव
- यह पुस्तक अनौपचारिक मार्गदर्शिका है, विकासकों की आधिकारिक स्थिति नहीं। API कभी भी बदल सकती है

[← पिछला भाग](04-realism.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](06-implementation.md)

[← पिछला भाग](05-troubleshooting.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](07-internals.md)

# भाग VI: महत्वपूर्ण कार्यान्वयन पूरक

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

## 19. रात्रि "छाया काली फलक उजला" सुधारें

केवल छाया दबाने से, सूर्य अनुपस्थिति में इंजन पूर्ण रंग (`engineColour`) अब भी उजला रहता है, फलक-छाया अंतर अप्राकृतिक दिखता है। पूर्ण रंग समग्र क्षय लगाकर उत्तर दें।

नीचे उदाहरण `bloxdSunDirection()` शून्य रात्रि निर्णय, दिशायुक्त दिन निर्णय मान, रात्रि टेरेन पूर्ण रंग क्षय करता है। `blockLight` व `heldLight` प्रबल स्थल क्षय घटाकर, मशाल आदि निकट प्रकाश यथासंभव रखें। `0.52` समायोज्य मान है, अधिक अंधेरा चाहिए तो घटाएँ।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**इस निरूपण की सीमा:** यदि `bloxdSunDirection()` "सूर्य=इकाई दिशा, नहीं=शून्य" द्विमान हो, दिन-रात पृथक् संभव पर संध्या क्षीण सतत अनुमान असंभव। और पूर्ण रंग क्षय से, इंजन दिन-प्रकाश व परिवेश एक साथ क्षीण होते हैं, पूर्ण कालपट्टी पुनरुत्पादन नहीं। तरल भी वही निरूपण चाहिए तो तरल हुक वापसी संबंध जाँचें।

## 20. जल प्राकृतिक दिखाने वाली जल समेकित रेसिपी

यह API दृश्य वर्ण नमूना नहीं ले सकता, अतः **फ्रेनेल पवन वर्ण मिश्रण व सूर्य झलक छद्म अभिव्यक्ति है, वास्तविक परावर्तन/अपवर्तन नहीं** (जल गहराई परिकलन v2 `bloxdOpaqueBehind()` से संभव होकर [भाग VIII](08-apiv2.md) R-E में पृथक)। नीचे आधार वर्ण रखते हुए, छिछले दृष्टिकोण निकट-आकाश वर्ण मिलाकर, केवल सूर्य रहते छोटी चमक जोड़ने का नमूना है।

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
- वास्तविक दृश्य प्रतिबिंब चाहिए: इस API निवेश में परदा वर्ण नहीं, केवल वर्ण मिश्रण से सत्य परावर्तन नहीं (गहराई तरल सीमित उपलब्ध। [भाग VIII](08-apiv2.md) R-E)।

यह रेसिपी **विद्यमान `bloxdLiquidLight` प्रतिस्थापित** करती है। R9.7 समनाम तरंग अभिलंब फ़ंक्शन व अन्य समनाम हुकों से दुहरा चिपकाएँ नहीं।

## 21. वास्तविक-मशीन परीक्षण सूची

कंपाइल सफलता व "सुंदर" अलग बातें हैं। क्रम से जाँचें:

1. **लोडिंग:** `pack.json` ZIP मूल में हो। चयन के तुरंत बाद `Ready. Reload the page to use it.` दिखता है और **पेज पुनः लोड करने पर सक्रिय** होता है। पुनः लोड के बाद `Ready to use` की पुष्टि करें। सहेजा गया पैक, इंजन-पक्षीय शीर्षक बदलने पर अगली पेज लोड पर हेडर सामग्री फ़िंगरप्रिंट मिलान से स्वतः पुनः सत्यापित होता है (पास हो तो वैसे ही सक्रिय / फेल हो तो blocked दिखता है)। पुराना पैक टूटा रहकर चुपचाप सक्रिय नहीं रहता।
2. **8 वेरिएंट:** strict / allow, प्रकाश चालू / बंद, टेरेन / तरल हर शर्त प्रकार रक्षक चूक न हो। खेल भले आंशिक शर्त प्रयोग करे, वितरण पैक 8 मानकर चले।
3. **दिन:** घास, पत्थर, बालू, लकड़ी आदि सामग्री वर्ण अनतिबहि, शीर्ष व पार्श्व प्रकाश-छाया संक्रमण प्राकृतिक हो।
4. **रात:** सूर्यप्रकाश स्थल सम सामग्री, छाया, मशाल समीप तुलना करें। केवल प्रदीप्त फलक शेष तो अनावृति क्षय, समग्र अंधेरा तो स्थानीय प्रकाश रक्षा समायोजित करें।
5. **जल:** ठीक ऊपर, छिछला दृष्टिकोण, तट, जलांत, रात अलग-अलग देखें। alpha व्यवहार व जलांत दृश्य खेल संश्लेषण विधि निर्भर, एकल दृष्टिकोण निर्णय न करें। जलांत में [भाग VII](07-internals.md) के अनुसार तरल परिभाषा रंग का आवरण सबसे आगे ढकता है, अतः पैक होने/न होने का अंतर मुख्यतः पृष्ठ व आवरण पार टेरेन में देखें।
6. **सीमा व दूर:** खंड/मूल संक्रमण पर तरंग पैटर्न उछलता न हो, दूर द्वि-फ़ॉग व श्वेत धुंध न हो।
7. **प्रदर्शन:** प्रति-फ्रैगमेंट हैश/त्रिकोणमिति/`pow` भारी प्रभाव न्यूनतम रखें। विवरण धीरे-धीरे जोड़कर FPS तुलना करें।

### ज्ञात निर्बंध आधार मानकर

- पैक टेरेन/तरल हुक सीमित, एक ही कोड आकाश, एंटिटी व UI निरूपण नहीं।
- छाया मानचित्र जोड़ने, परदा-स्थान परावर्तन, अपवर्तन, ब्लूम आदि निवेश नहीं (दृश्य गहराई तरल सीमित `bloxdOpaqueBehind()` रूप में खुली। [भाग VIII](08-apiv2.md) देखें)।
- `bloxdTime()` एनिमेशन काल है, खेल दिन-रात संबंध गारंटी नहीं।
- `bloxdSunDirection()` शून्य तो सत्य चंद्र दिशा अज्ञात, वातावरण सन्निकटन "चंद्र भौतिकी" नहीं। दिशात्मक चांदनी `-bloxdSunDirection()` से बनती है (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](07-internals.md) R-A)।
- `s.position` / `l.position` स्थानीय निर्देशांक, विश्व निर्भर प्रभाव हेतु `bloxdOriginOffset()` जोड़ें। खंड भीतर स्थानीय पैटर्न हेतु सचेत स्थानीय निर्देशांक प्रयोग करें।

## 22. शेडर सीमा आने पर संयोजन

शेडर-पैक पक्ष में टेक्सचर जोड़ने/सैंपल करने की सीमा है, अतः सामग्री की बारीक बनावट या आकाश का चित्र बदलना हो तो केवल शेडर से हल करने का प्रयास न करें। Bloxd.io हेतु सार्वजनिक टेक्सचर-पैक रिपॉज़िटरी [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) में टेक्सचर, skybox, मॉडल आदि संभालने की भिन्न विधियों के उदाहरण हैं। यह शेडर-पैक API का आधिकारिक विनिर्देश नहीं, बल्कि भिन्न सिस्टम के संसाधन-उदाहरण के रूप में देखें।

संदर्भ हेतु, समुदाय में "cinematic shader" के रूप में प्रचलित वितरण का विश्लेषण-उदाहरण: भीतर टेक्सचर पैक था (128x128 टेक्सचर, `pack.json` / `.wgsl` बिना)। "छाया-युक्त शेडर जैसा" रूप अधिकतर टेक्सचर-पक्ष की कारीगरी है; शेडर-पैक से प्रकाश व छाया अलग-अलग बनाने (R9.12) की दिशा और टेक्सचर-पक्ष की पूर्ति मिलाकर चलना व्यावहारिक है।

वास्तविकता में, **प्रकाश व वर्ण शेडर से समायोजित कर, सामग्री व आकाश अनुरूप संसाधन पैक से पूरा** करना उत्तम है। पर सहप्रयोग संभावना व पठन क्रम खेल कार्यान्वयन व सेटिंग अनुसार जाँचें।

टेक्सचर-पैक पक्ष का भी विनिर्देश है (संदर्भ): आकार-सीमा base64 रूपांतरण के बाद JSON स्ट्रिंग लंबाई में 25MB है, और PNG का base64 +33% फैलता है, अतः कच्चे चित्रों का कुल ~18-19MB व्यावहारिक सीमा है। CSS सरल regex विश्लेषण से संभाला जाता है, अतः नेस्टिंग या टिप्पणियाँ न लिखें।

## 23. शेडर पैकों सहित जलांत सत्य

जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogVisibility भी संसूचित नहीं करता)।

[← पिछला भाग](05-troubleshooting.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](07-internals.md)

[← पिछला भाग](06-implementation.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](08-apiv2.md)

# भाग VII: आंतरिक पूरक

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

इंजन कार्यान्वयन विश्लेषण से ज्ञात अतिरिक्त विनिर्देश। सब वर्तमान उत्पादन बिल्ड JavaScript से सीधे पुनः प्राप्त।

## 24. सूर्य व चंद्रमा अभिज्ञान

`bloxdSunDirection()` स्रोत केवल आकाशपेटी प्रकार बदलने पर पुनर्लिखित सूर्य दिशा बफर है — कसौटी "आकाश में सूर्य है" नहीं, **"आकाशपेटी पृथ्वी प्रकार है"** है।

| आकाशपेटी | `bloxdSunDirection()` |
|---|---|
| `default` (प्रक्रियात्मक आकाश) | अशून्य (डिफ़ॉल्ट नीचे) |
| `gloomy` / `interstellar` / `space_*` (घन टेक्सचर) | **सदा (0,0,0)** |

**चंद्रमा सदा `-bloxdSunDirection()` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। रात्रि सूर्य ऊँचाई से जाँची जाती है — `bloxdSunDirection().y < 0` (सूर्य क्षितिज नीचे) पर चंद्रमा ऊपर है। पर डिफ़ॉल्ट दुनियाओं में सूर्य स्थिर, अतः चंद्रमा भी स्थिर — गतिशील चंद्रमा केवल दिन-रात चक्र दुनियाओं में दिखता है।

डिफ़ॉल्ट दुनिया सूर्य दिशा लगभग `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 से संगणित इकाई सदिश, स्थिर)। वितरण पैक परीक्षण में झलक दिशाएँ कागज़ पर भविष्यवाणी का व्यावहारिक संदर्भ मान।

दिन-रात चक्र इंजन में अंतर्निहित नहीं — inclination स्थिर अंक है, गतिशील दिन वाली दुनियाएँ खेल पक्ष अद्यतित करती हैं। हर अद्यतन पर `bloxdSunDirection()` भी पुनर्लिखित अनुगमन करता है।

टेरेन दिशात्मक प्रकाश दृश्य आरंभ निर्मित केवल 2 दीप हैं, **दिशा व तीव्रता स्थिर, दिन-रात अपरिवर्तित**। संक्षेप में **टेरेन चमक का कोई घटक काल निर्भर नहीं। दिन-रात "रूप" केवल आकाशपेटी व bloxdSunDirection() से आते हैं**, अतः रात्रि अवनमन पैकों को समय-पट्टी स्वयं bloxdSunDirection() से अनुमान करनी चाहिए (§19 `sunPresent` तकनीक)।

### R-A. दिशात्मक चांदनी — moonDir = −bloxdSunDirection()

चंद्रमा ऊपर रहते ही नील-श्वेत Lambert व मंद स्पेक्युलर जोड़ता है। `moonUp` डिफ़ॉल्ट स्थिर-सूर्य दुनियाओं में 0 है, वहाँ कुछ नहीं होता — **केवल दिन-रात चक्र दुनियाओं में छूटने वाली सुरक्षित चांदनी**।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // चंद्रमा सदा सूर्य के ठीक विपरीत; दिन में moonDir.y < 0 से स्वतः बुझता है
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. फ़ॉग आंतरिक

फ़ॉग परिकलन सदा LINEAR विधा (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` सहित (D = फ़ॉग सेटिंग; केवल D = 0 विशेष fogEnd = 5 सहित)। **प्रवणता पट्टी केवल 32 खंड चौड़ी** है, व `l.fogVisibility` "दूरी धुंध" से कम **लोडेड दुनिया किनारे तक प्रसामान्यीकृत दूरी** है। खिलाड़ी अनुसार लोड दूरी बदलती है, अतः दूरी प्रभाव स्वयं `distance(l.position, bloxdEyePosition())` गिनें (रेसिपी R-B)। (v3 नोट: रेंडरर का फ़ॉग फ़ंक्शन वास्तव में **चार** मोड लागू करता है — बंद / चरघातांकी / चरघातांकी-वर्ग / रैखिक — और जारी खेल रैखिक मोड चलाते हैं; पुनः प्राप्त स्रोत और टिकाऊपन का तर्क [भाग IX](09-apiv3.md) §50 में है।)

डिफ़ॉल्ट फ़ॉग वर्ण `rgb(183, 191, 195)` (हल्का नील-धूसर)। दुनिया रचयिता `fogColourOverride` (hex) से बदल सकते हैं। फ़ॉग विधा 0 (NONE) पर **fogColour काला आता है** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). `mix(l.fogColour, col, l.fogVisibility)` का मानक रूप सुरक्षित है क्योंकि fogVisibility 1 पर फ़ॉग वर्ण अप्रयुक्त रहता है। स्क्रिप्ट API में `fogChunkDistanceOverride` व `fogOnSkybox` विकल्प भी हैं, कस्टम खेल फ़ॉग दूरी (D के बराबर) व स्काईबॉक्स पर फ़ॉग लगाना अलग-अलग सेट कर सकते हैं। डिफ़ॉल्ट में स्काईबॉक्स फ़ॉग से प्रभावित नहीं (`fogOnSkybox` सक्रिय खेलों में ही स्काईबॉक्स भी फ़ॉग वर्ण में रंगता है)।

खिलाड़ी-पक्ष `showFog` बंद करने पर फ़ॉग 3200–3232 खंड की सीमा में धकेल दिया जाता है और व्यावहारिक रूप से अमान्य हो जाता है (fogVisibility ≈ 1 बना रहता है)।

### R-B. लोड-सीमा पट्टी — fogVisibility "दुनिया किनारा" रूप में

लोड-सीमा के निकट की 32-खंड पट्टी को शांत ठंडे रंग में संसाधित करके दुनिया का किनारा अलग से दिखाई नहीं देता। दूरी को अलग से गिने बिना खिलाड़ी की लोड-दूरी सेटिंग का स्वतः अनुसरण होना ही इसका लाभ है।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = भीतर (किनारे तक गुंजाइश), 0 = किनारे बाहर निकलने वाला
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight आंतरिक

`blockLight` RGB 3 प्रणालियों का **रंगीन प्रकाश** है। प्रत्येक प्रकाश-स्रोत खंड हेतु उत्सर्जन वर्ण `[R, G, B]` (प्रत्येक 0-15) परिभाषित है, जो सीधे प्रकाश वर्ण बनता है (सामान्य मशाल = उष्ण श्वेत (14,14,12) / लावा = नारंगी (14,8,2) / बीकन = सियान (5,14,14) / श्वेत मशाल = (15,15,15) आदि)। शीर्ष चरण में यह एक float गुण में r / g / b / sky के 4 निबल रूप में पैक होकर आता है। लाइट हुक में तीनों प्रणालियाँ अलग संभालकर रंगीन स्थानीय प्रकाश बनाया जा सकता है — उष्ण मशाल रेसिपी (R9.1) का आधार यही व्यवहार है।

`aPackedLightLevels` विकोडन पर इंजन हर प्रणाली **उज्ज्वलतम RGB प्रणाली के 35% का फ़र्श** बिछाता है। जैसे "शुद्ध लाल प्रकाश" शीर्षों में (1.00, 0.35, 0) उठकर अंतर्वेशन·लिफ्ट चढ़ता है। मशाल नारंगी खेल में "लाल से अधिक श्वेत-गुलाबी" दिखना यहीं से है — उष्ण मशाल रेसिपी (R9.1) संतृप्ति इस डिफ़ॉल्ट विरुद्ध समायोजित करें।

प्रकाश संयोजन योगात्मक नहीं है। इंजन भीतर 35% फ़र्श वाले खंड-प्रकाश और `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` से बने आकाश-प्रकाश का **max** लेता है, फिर हस्त प्रकाश (परिवेश-बूस्ट के बाद) को और max से जोड़ता है। इस संयोजन में प्रयुक्त प्रणाली मान **लिफ्ट-बाद** हैं — इंजन उन्हीं उठे हुए प्रकाश स्तरों से संयोजन करता है जो हुक इनपुट तक पहुँचते हैं (`terrainLightLevels`, लिफ्ट वक्र के बाद), v2 और v3 दोनों में। अतः `blockLight` और `skyLight` एक-दूसरे को नहीं काटते, गाढ़े पक्ष का योगदान छोड़ दिया जाता है — आकाश-प्रकाश घटाने पर भी जहाँ खंड-प्रकाश प्रबल है वहाँ लगभग अंधेरा नहीं होता। एक्सपोज़र व क्षय रेसिपी इसी संरचना पर बनाएँ ([भाग VI](06-implementation.md) §19 की स्थानीय-प्रकाश रक्षा इसी संरचना की भरपाई है)।

हस्त प्रकाश (`heldLight`) परास उज्ज्वलतम प्रकाश वर्ण अनुसार (अधिकतम 15 खंड) `dist^0.75` पूर्व-प्रक्रमण सहित, वही 35% प्रणाली फ़र्श, व `l.heldLight` परिवेश-बूस्ट **पूर्व** मान है। शंकु क्षय, इंजन के प्रकाश मॉड्यूल से बहाल: किरण का कोणीय क्षीणन `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` है, जहाँ `t` शंकु अक्ष से प्रसामान्यीकृत कोण है (0 = केंद्र, 1 = किनारा); पहुँच `(rangeOverride > 0 ? rangeOverride : उज्ज्वलतम चैनल) × शंकु क्षय` है, जिसमें `rangeOverride` हस्त-प्रकाश वर्ण के alpha से पढ़ा जाता है; पहुँच के भीतर override `(range − dist) / range` से क्षीण करता है, जबकि डिफ़ॉल्ट (पूर्व-प्रक्रमित) दूरी को प्रणाली-दर-प्रणाली घटाता है; फिर 35% फ़र्श, 15 से विभाजन, लिफ्ट वक्र, और अंत में परिवेश-बूस्ट आता है। अनुकूलित मद `spotlightRange` व शंकु कोण स्थिर कर सकते हैं — "पकड़े रहते किरण" विधा जिसकी शंकु कैमरा अनुगमन करती है। पैक किरण दिशा जान नहीं सकते।

अनुकूलित खंड `skyLightEmission` (0–15) रख सकते हैं, जो **blockLight BFS से अलग skyLight प्रणाली स्वयं अंतःक्षेपित** करता है। R9.12-ढंग पैक सूर्य/छाया skyLight देहली निर्णय कृत्रिम प्रकाशों से उठे skyLight दुनियाओं में चूक सकते हैं। वितरण पैक blockLight संयोजन निर्णय अधिक सुदृढ़ करते हैं।

## 27. पाइपलाइन विवरण

- **surface हुक alphaTest "पूर्व" चलते हैं**: `out.alpha` सीधे त्याग परीक्षण खिलाता है। कटआउट सामग्री (घास, पत्ते) dither-ढंग विलयन प्रभाव अनुमति (रेसिपी R-C)। तरलों (मिश्रण) में `out.alpha` वास्तविक पारदर्शिता है (रेसिपी R-D)। सामान्य अपारदर्शी टेरेन पर प्रभाव नहीं — भ्रमित न हों
- **`l.ambient` सामग्री** `material.ambient × sceneAmbient` है, सामग्री अनुसार भिन्न। दृश्य पक्ष ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5) बाँधता है — नियत डिफ़ॉल्ट कभी न प्रोग्राम करें
- **दृश्य की दिशात्मक रोशनी 2 लैंपों की बनी है**: मुख्य लैंप (दिशा आकाश सेटिंग के सूर्य-स्थान से, तीव्रता 1.0) और फ़िल लैंप (दिशा `[-0.5, -1, -1]`, तीव्रता 0.35) का Lambert योग `l.directional` तक पहुँचता है। फ़िल लैंप की दिशा नीचे है, अतः ऊपरी सतह पर योगदान नहीं देता, नीचे मुख वाली सतहों (गुफा की छत आदि) को उठाता है। टेरेन केवल `_initScene` में जोड़े गए लैंप गिनता है; शुरू होने के बाद दृश्य में जोड़े गए लैंप टेरेन व खंड-मॉडल से अनदेखे रहते हैं (आधिकारिक चेतावनी पाठ मौजूद है)
- **`bloxdTime()` का वास्तविक रूप `performance.now()` है**: `time() { return performance.now() / 1e3 % 3600 }` — ब्राउज़र के चालू होने से बीता समय, जो 1 घंटे पर लौटता है। खेल के दिन-रात या दुनिया के बीते समय से कोई संबंध नहीं। खेल घड़ी से समकालिक एनिमेशन हेतु दिन-रात चक्र वाली दुनिया में `bloxdSunDirection()` के दिगंश से अनुमान लगाना व्यावहारिक है
- **हेडर फ़ंक्शनों का आधार एक ही uniform है**: इंजन `@group(3) @binding(0)` पर 64 बाइट uniform (time / originOffset / sunDirection / eyePosition के 4 स्लॉट, little-endian) रखता है, और `bloxdTime()`, `bloxdOriginOffset()`, `bloxdSunDirection()`, `bloxdEyePosition()` उन्हीं स्लॉट के पठन हैं। `originOffset` वर्तमान बिल्ड में सदा `[0, 0, 0]` है (फ़्लोटिंग-पॉइंट विश्व निर्देशांक हेतु आरक्षित स्लॉट)। पैक इस uniform को बदल नहीं सकता, और पैक व इंजन की WGSL एक ही मॉड्यूल में मिलाई जाती है, अतः वही group/binding स्वयं घोषित करना भी संभव नहीं। (v3 में दो स्लॉट बदले — `seconds` / `renderOffset`; फ़ंक्शन अब `bloxdSeconds()` / `bloxdRenderOffset()` हैं — और `@group(3) @binding(1)` पर दृश्य-गहराई texture जोड़ा गया; [भाग IX](09-apiv3.md) §41 व §51 देखें।)
- **शीर्ष डेटा मेशर (Web Worker) बनाता है**: खंड टेरेन को प्रति शीर्ष 28 बाइट (atlas सहित 32 बाइट) इंटरलीव्ड रूप में सजाता है — स्थिति = float32×3 / अभिलंब = 8bit signed int×4 / रंग = 8bit अर्ध-पूर्णांक×4 (`s.colour` का वास्तविक रूप — tint × AO मेशर चरण में ही 8bit में पकाए जाते हैं, पैक से अलग करना/पुनः प्राप्त करना सैद्धांतिक रूप से असंभव) / UV = float32×2 / atlasIndex = float32। केवल लाइट-लेवल अलग 4 बाइट शीर्ष बफ़र में चलते हैं ([भाग VII](07-internals.md) §26 · [भाग II](02-api.md) §11)। शीर्ष चंक-इकाई instancing से खींचे जाते हैं
- लोड के समय खंड सीमाओं पर दिखने वाला महीन चेकर पैटर्न इंजन का परदा-अंतरिक्ष Bayer 4×4 dither खंड फ़ेड है, पैक बग नहीं (ग्राफिक सेटिंग में `chunkFadeIn` बंद करने पर अक्षम हो जाता है)
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

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // निचले खंडों से विलीन होता है; अधिक dissolve टिका रहता है
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. जल निकट-कैमरा फ़ेड — तरल alpha दृष्टि स्पष्ट रखता है

तरल हुक `out.alpha` मिश्रण सीधे खिलाता है। कैमरा ठीक नीचे पृष्ठ ही पतला करके, गोता/जलोपरि कैमरा दृष्टि सुनिश्चित करने की रेसिपी।

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 खंड पूर्ण पारदर्शी से सामान्य
    #endif
    return out;
}
```

## 28. पैक दृश्य मान बदलने वाली चीज़ें — परीक्षण सूची

वही पैक **दुनिया व खिलाड़ी सेटिंग के अनुसार `l.*` की सामग्री बदलने** से अलग दिखता है। वितरण से पहले कम से कम इन 3 परिवेशों में रूप देखें:

1. **सामान्य दुनिया** (डिफ़ॉल्ट आकाशपेटी, ओवरराइड नहीं) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, डिफ़ॉल्ट वर्ण
2. **अंतरिक्ष आकाशपेटी दुनिया** — bloxdSunDirection() = 0। `sunPresent` शाखा रूप
3. **अनुकूलित दुनिया `visionMinLightColour` / `skyLightColourOverride` सहित** — उठे अंधेरे व वर्ण

मुख्य भिन्नता स्रोत: `lightingOverride` (बलात् प्रकाश) / `skyLightColourOverride`, `ambientLightColourOverride` (hex अदला-बदली) / `visionMinLightColour` ("दिखने वाला सबसे गाढ़ा वर्ण" — कार्यान्वयन `uSkyLightColour` और `uAmbientLightColour` दोनों पर घटक-वार max; Night Vision प्रयोग करता है — "गुफा घोर अंधेरी" पैक सोचा अंधेरा नहीं करते, आकाश का रंग भी ऊपर उठता है) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() विद्यमानता)। `uSkyLightColour` डिफ़ॉल्ट = (1,1,1) श्वेत, `uAmbientLightColour` डिफ़ॉल्ट = (0.25,0.25,0.30)। `l.ambient` दृश्य पक्ष = ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5)। `l.fogVisibility` खिलाड़ी फ़ॉग/चंक दूरी सेटिंग का अनुगमन करता है। साथ ही `cameraTint` (पूरे परदे पर RGBA टिंट) और `proximityFadeDistance`, `proximityFadeMinOpacity` (इकाई का कैमरा-निकट फ़ेड) भी दुनिया-सेटिंग से बदलने वाले कारक हैं, विशेषकर `cameraTint` पैक आउटपुट के ऊपर लगने वाली अंतिम प्रक्रिया है। इनमें से अनेक स्क्रिप्ट API (`serverOption`) से भी सेट हो सकते हैं और खेल चलते समय भी बदल सकते हैं।

## 29. दोषमार्जन साधन

- URL पैरामीटर `?renderer=lite` — Lite (WebGPU) रेंडरर बलात् (`webgl2` / `babylon` भी; `babylon` webgl2 का पुराना नाम है)। प्राथमिकता क्रम: URL पैरामीटर > localStorage का `bloxdRenderer` > सेटिंग्स स्क्रीन > डिफ़ॉल्ट (webgl2)। अमान्य मान चेतावनी सहित अनदेखे होते हैं। URL या localStorage में ओवरराइड बचा रहने पर WebGPU (lite) आवश्यक स्थिति में विफलता आती है और "needs the new WebGPU renderer, so remove the renderer override..." दिख सकता है ([भाग V](05-troubleshooting.md) §17)
- URL प्राचल `?vconsole` — परदा अंतः कंसोल (VConsole)। सचल वास्तविक-मशीन सत्यापन में काम का
- URL पैरामीटर `?drawcalls=1` — ड्रॉ-सांख्यिकी डिबग पैनल जुड़ता है। डिबग कंसोल से गेम-ऑब्जेक्ट चुनकर, या `drawCalls()`, `why()`, `configureDrawCallWatching()` से, पैक ही नहीं बल्कि बड़े गिमिक्स का दोहरा ड्रॉ (ओवरड्रॉ) और प्रति ड्रॉ लगभग 65 हज़ार शीर्ष की सीमा तक पहुँच जाँचकर प्रदर्शन-कमी का कारण अलग कर सकते हैं
- कंसोल `noa-engine v0.33.0` व `Renderer: lite from <स्रोत>` दिखाता है — रेंडर पथ अपनिदान बचने पहले इन्हें देखें
- WebGPU रेंडरर पैक सहित "बलात् चालू" तालाबंद होता है। "Disable Block Texture Atlas" सेटिंग भी तालाबंद (Atlas चालू रहता है), व WebGPU बिना परिवेश पैक बिल्कुल लागू नहीं होता। वितरण पृष्ठों पर "WebGPU ब्राउज़र आवश्यक" लिखने का आधार
- खंड टेक्सचर का वास्तविक रूप 2D array texture (`texture_2d_array`) है, टेरेन का सैंपलर nearest और repeat पर सेट है। साथ ही मेशर समान सामग्री, AO व लाइट वाले फलकों को एक आयत में मिलाता है (**greedy meshing**), अतः मर्ज किए फलकों पर शीर्ष UV टाइल-चौड़ाई से आगे जा सकता है (किनारे पर 0.0015 का इनसेट)। दोहराव हार्डवेयर का repeat addressing संभालता है, इसलिए मर्ज फलक बिना सीम के दिखते हैं। पर `vUV` के आधार पर प्रक्रियात्मक विवरण ऊपर रखने से मर्ज फलक की सीमा पर असंतति आ सकती है, अतः विश्व स्थिति (`s.position` + `bloxdOriginOffset()`) के आधार पर रचना करना सुरक्षित है
- खेल प्रवेश रनटाइम पुनः सत्यापन (`checkCompilation`) ब्राउज़र WebGPU में वास्तविक टेरेन सामग्री संकलित करता है (सेटिंग परदा स्थैतिक सत्यापन से कठोर)। यहाँ गिरने वाले पैक उस खेल से वर्जित होते हैं

## 30. गेम-अनुसार अनुप्रयोग मोड (`shaderPackPolicy`)

यहाँ §7 की `allow / strict` अवधारणा का शीर्षक-स्तरीय अर्थ निश्चित किया जाता है। केवल वही शीर्षक, जिनकी गेम-परिभाषा में स्पष्ट रूप से `shaderPackPolicy: "allow"` है, पूर्ण मोड (vertex हुक, `discard`, टेरेन `alpha`) में चलते हैं; बिना निर्दिष्ट शीर्षक (या allow के अतिरिक्त मान) strict होते हैं — `BLOXD_STRICT` परिभाषित होता है और गार्ड में लिखा कोड स्वतः निष्क्रिय हो जाता है। यह निर्णय पैके के पक्ष से नहीं चुना जा सकता; अतः किस शीर्षक में क्या चलता है, यह जान लेना वितरण की पूर्वशर्त है।

- संदर्भ-बिल्ड: `szby6g.main.94a7596c.js` (2026-10-17 का प्रोडक्शन-डिप्लॉय)। सभी 111 गेम-परिभाषाओं का स्थैतिक विश्लेषण — परिणाम: **allow 26 प्रविष्टियाँ (12 शीर्षक) / strict 85 प्रविष्टियाँ**। वही 12 allow लिटरल उन्हीं 12 शीर्षकों में v3 प्रोडक्शन बंडल (`3ymzdd`, 2026-10-20) पर अपरिवर्तित पुनः पुष्ट हुए — नीचे की सूची v3 में शब्दशः लागू रहती है।
- `shaderPackPolicy` से भी ऊपर वितरण-चैनल पक्ष का गेट (`canUseShaderPacks` के समान) है; बाहरी पोर्टल से वितरण (Coolmath Games संस्करण आदि) में `shaderPackPolicy` के निर्णय से पहले ही शेडर-पैक तंत्र निष्क्रिय हो सकता है। नीचे का allow / strict वर्गीकरण bloxd.io मूल Web संस्करण के विश्लेषण पर आधारित है।
- allow 12 स्थानों पर घोषित है: गेम-परिभाषाओं में सीधे लिखे गए 8 स्थान और आधार-चर (`tb` / `kz` / `cb` / `Fb`) के 4 स्थान; वेरिएंट्स स्प्रेड विरासत (`{...tb,...}`) से इसे ग्रहण करते हैं। वेरिएंट-स्तरीय अलग ओवरराइड (पिता-allow / पुत्र-strict की उलटी रूपरेखा) अभी कोई नहीं।

12 allow शीर्षक (कुल 26 प्रविष्टियाँ):

- **Test Gym** — मुख्य + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (कुल 11 प्रविष्टियाँ)
- **Doodle Cube** — मुख्य + Solos / Duos (कुल 3)
- **Rocket Obby** — मुख्य + Sheep / January (कुल 3)
- **9 एकल शीर्षक**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict पक्ष में विशेष रूप से भ्रामक बिंदु:

- **Superflat Creative (classic_creativeFlat) strict है**। नाम में "Creative" है, पर classic परिवार में allow केवल साधारण Creative (`classic_creative`) है। Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns आदि भी सब strict
- **Custom Games (customGames) strict है**। स्वनिर्मित कस्टम गेम में vertex हुक-धारा के प्रभाव सक्रिय नहीं होते। सत्यापन कार्य के लिए Test Gym ही भरोसेमंद विकल्प है
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) जैसे प्रमुख PvP व सर्वर शीर्षक सब strict

इसके अलावा strict शीर्षकों में भी पैक का लोड व कंपाइल होता रहता है, और surface / light जैसी फ़्रैगमेंट-पक्ष की रेसिपी सामान्य रूप से चलती हैं। प्रतिबंध केवल vertex हुक (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` और टेरेन `alpha` पर हैं (तरल में हमेशा मौजूद)।

यह सूची उपरोक्त बिल्ड के स्थैतिक विश्लेषण का परिणाम है; इंजन-अपडेट से allow/strict का वितरण बदल सकता है। नया संस्करण आने पर पुनः जाँचें।

[← पिछला भाग](06-implementation.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](08-apiv2.md)

[← पिछला भाग](07-internals.md)·[मैनुअल पर वापस जाएं](README.md)

# भाग VIII: API Version 2 माइग्रेशन गाइड

> वर्तमान खेल 2026-10-26 से `apiVersion: 4` चाहता है और लोड पर v1/v2/v3 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) और [भाग X](10-apiv4.md) देखें।

लक्ष्य बिल्ड: `6qxffk.main.5912a15f.js` (2026-10-16 का उत्पादन परिनियोजन)। इस पुस्तक के भाग I–VII v2 आधार पर पुनः लिखे जा चुके हैं; यह भाग VIII v1 से प्रवासन बिंदु व v2 नई सुविधाएँ समेटता है। नई सुविधा कोड उदाहरण v2 कंपाइलर द्वारा 8/8 वेरिएंट सत्यापन व ब्राउज़र WGSL कंपाइलर (Tint) सत्यापन (§38) उत्तीर्ण हैं, पर विद्यमान रेसिपी v2 रूपांतरण यांत्रिक पहचानकर्ता प्रतिस्थापन है, अतः वितरण पूर्व वास्तविक-मशीन कंपाइल से अवश्य सत्यापित करें।

## 31. v1 पैकों का भाग्य (पहले निष्कर्ष)

खेल manifest `apiVersion` **ठीक-ठीक 2 मिलान** माँगता है। v1 पैक लोड `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n कुजी `shaderPack:loadWrongApiVersion`) से अस्वीकृत होता है। v1/v2 **समानांतर समर्थन नहीं**। इंजन संरक्षित पैकों का `validation.headerVersion` (शीर्ष पूर्ण पाठ हैश) पुनः जाँचता है, अतः इंजन अद्यतन पर संरक्षित पैक स्वतः "पुनः जाँच आवश्यक" होने की व्यवस्था v1 समान है।

## 32. पहचानकर्ता पूर्ण पुनर्नामकरण (संगति तालिका)

v2 में अंडरस्कोर नामकरण कैमलकेस में एकीकृत हुआ। **पुराने नाम सर्वथा अप्रयोज्य।**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (आंतरिक uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

हुक प्रकार (vertex / surface / light × terrain / liquid 6) व `pack.json` रूप (`apiVersion` / `name` / `author`) अपरिवर्तित। लोडर सीमाएँ भी अपरिवर्तित (zip 32MB / प्रविष्टि 1024 / `.wgsl` 256 फाइलें / कुल 256KB / manifest 64KB)।

## 33. हटाए फ़ील्डों का नया ठिकाना

v1 में `time` / `eyePosition` / `sunDirection` / `originOffset` संरचना फ़ील्ड थे। v2 में **ये फ़ील्ड हटाए गए; बदले में इंजन uniform (`bloxdPackInputs`) पढ़ने वाले शीर्ष फ़ंक्शन** प्रयोग करें। फ़ंक्शन uniform सीधे पढ़ते हैं, अतः **हुक बाहर मॉड्यूल-स्कोप फ़ंक्शन व vertex हुकों से भी बुलाए जा सकते हैं**।

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` से विश्व निर्देशांक रूपांतरण | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. नई सुविधा ①: `blockId` (खंड-विशिष्ट शेडिंग)

तीनों संरचनाओं `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` में `blockId: u32` जोड़ा गया। यह **फलक के स्वामी खंड का ID** (0–65535) है और उसी फलक में स्थिर रहता है (`@interpolate(flat)` से पारित)। टेक्सचर रंग पर निर्भर बिना खंड-प्रकार पहचानने में प्रयोग कर सकते हैं। पर ID-खंड-प्रकार संगति तालिका इंजन के भीतर है और पैक से दिखाई नहीं देती, अतः **कौन ID किस खंड का है, यह दुनिया में मापकर या नीचे दिए संदर्भ डेटा से जाँचना आवश्यक है**। भीतर यह ID शीर्ष-रंग के α (निचले 8bit) और अभिलंब के w (ऊपरी 8bit) के कुल 16bit में पकाकर ले जाई जाती है; 65535 की सीमा इसी पथ-चौड़ाई से आती है। blockId तंत्र स्वयं केवल सक्रिय शेडर-पैक होने पर सक्रिय होता है (बिना पैक wire का गंतव्य padding ही रहता है, पर भाग II की संरचना-परिभाषा से यह अंतर दिखता नहीं)।

**संदर्भ**: लेखक गेम-प्रविष्टि सूची [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) पर प्रकाशित करता है (`entries.json`: id ↔ खंड-नाम तालिका; `Furnace|meta|rot2` जैसे घूर्णन/meta रूप भी पृथक ID हैं)। मिलान गेम अपडेट से बदल सकते हैं — पक्की जांच वास्तविक गेम में करें।

अकसर प्रयुक्त खंडों के उदाहरण (entries.json से, 2026-10-18 तक। केवल कम id वाले टेरेन-प्रकार चुने गए):

| ID | खंड नाम | ID | खंड नाम |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json में औज़ार आदि गैर-खंड प्रविष्टियाँ भी हैं, पर टेरेन व तरल हुक तक खंड-प्रकार की id ही पहुँचती हैं।

### R-F. blockId से खंड प्रकार रंगत

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // जैसे: प्रस्तर परिवार (id उच्च बिट प्रतिरूप) शीतल झुकाएँ
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. blockId का वास्तविक मापन — bit-समतल प्रदर्शन पैक

संगति तालिका में न होने वाले खंड की id दुनिया में जाँचने की डिबग रेसिपी। शुरुआत का `plane` `0, 1, 2, …` बदलते हुए जाँचने वाले खंड के फलक का रंग पढ़ें।

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

फलक का रंग blockId के 3 bit सीधे RGB में दिखाता है (काला = 0 / लाल = 1 / हरा = 2 / पीला = 3 / नीला = 4 / मैजेंटा = 5 / सियान = 6 / श्वेत = 7)। एक बार देखने पर octal का 1 अंक पढ़ा जाता है। p0 → p3 क्रम में 3, 2, 7, 2 पढ़ा जाए तो ऊपरी अंकों से बना octal 2723 = 1491 id है (Lava)। कम id वाले टेरेन हेतु p0 व p1 की 2 बार ही पर्याप्त। केवल surface हुक से बना है, अतः strict शीर्षक में भी चलता है।

### R-H. केवल पत्तियों को झुलाना — blockId द्वारा vertex हुक सीमित करना

R7 की पवन रेसिपी ([भाग III](03-recipes.md)) पूरे टेरेन को लहराती है, पर vertex हुक में भी `blockId` पढ़ा जा सकता है, अतः लक्ष्य केवल पत्ती-खंडों तक सीमित किया जा सकता है। id सूची व WGSL हेतु array इस प्रकार है (2026-10-18 के वास्तविक मापन पर। Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / फल-रूप / Autumn Aspen के 22 प्रकार):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex हुक strict शीर्षक में स्वतः निष्क्रिय (§36 देखें)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // विस्थापन विश्व-स्थिति का सुचारु फ़ंक्शन रखें। विश्व पर वही स्थान दर्शाने वाले
        // साझा शीर्ष समान मान से हिलते हैं, अतः फलक नहीं उखड़ते ([भाग III](03-recipes.md) R7 भी यही सिद्धांत)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id सूची इंजन अपडेट से बढ़ती है (मापन में भी नए बिल्ड में 50 प्रकार के खंड जुड़े)। निरंतर प्रयोग हेतु [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) या R-G का bit-समतल प्रदर्शन से अतिरिक्त id जाँचकर array में जोड़ें
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) ज़मीन पर बिछने वाली अठोस पत्तियाँ हैं। हिलाने पर ज़मीन से उठती दिखती हैं, अतः array से हटाकर छोड़ देना भी एक विकल्प है
- strict शीर्षक में vertex हुक पूरी तरह निष्क्रिय होता है, पर ऊपर का guard हो तो "हिलना बस रुकता है", fragment पक्ष के प्रभाव जीवित रहते हैं

## 35. नई सुविधा ②: `BLOXD_SCENE_DEPTH` व `bloxdOpaqueBehind()` (मुख्य)

v1 में संरचनात्मक असंभव गहराई पहुच **केवल तरल (liquid) प्रोग्रामों हेतु** खुली। वर्ण नहीं, पर **पीछे अपारदर्शी फलक दूरी व स्थिति ज्यामिति उपलब्ध**। प्ररूपी उपयोग मापी जल मोटाई से अवशोषण वर्ण परिकलन है।

उपयोग नियम:

| उपयोग | परिणाम |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` में अरक्षित आह्वान | ठीक (तरल वेरिएंटों में सदा परिभाषित) |
| `bloxdTerrainSurface` में अरक्षित आह्वान | त्रुटि। `#ifdef BLOXD_SCENE_DEPTH` से लपेटें |
| vertex हुकों में आह्वान | त्रुटि (केवल surface / light हुक) |

टेरेन हुकों में भी गहराई चाहें तो `#ifdef BLOXD_SCENE_DEPTH` से लपेटें (टेरेन हुक तरल प्रोग्रामों में पुनः प्रयुक्त होते हैं, अतः गहराई केवल तरल पक्ष जीवित)।

### R-E. जल मोटाई अवशोषण (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // जल स्तंभ लंबाई = यहाँ से पीछे अपारदर्शी फलक तक
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert अवशोषण: लाल शीघ्र गिरता, नीला दूर पहुचता
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // पीछे आकाश = गहरे जल नील की ओर खींचें
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

अनुप्रयोग: मोटाई आधारित अवशोषण/प्रकीर्णन, `behind.position` से तल विश्व निर्देशांक से तरंग-कास्टिक-ढंग पैटर्न प्रक्षेपण, `found=false` से आकाश व अवरोध भेद से जलपृष्ठ आकाश परावर्तन, गहराई से झाग व मैलापन चरणबद्ध। गहराई प्रतिलिपि पाइपलाइन निर्माण विफल हो तो "पीछे कुछ नहीं" सुरक्षित अवनति। गहराई टेक्सचर की तैयारी पेज के रेंडरर निर्माण के समय "सक्रिय पैक गहराई पढ़ता है या नहीं" से तय होती है, अतः **गहराई पढ़ने वाले पैक के प्रयोग में हमेशा पेज पुनः लोड करें**। पैक सक्रिय रखकर बिना पुनः लोड गहराई माँगी जाए तो कंसोल में एक बार `…reads scene depth on a page that didn't turn it on` चेतावनी आती है और गहराई 1×1 विकल्प टेक्सचर से बदल जाती है, इसलिए `bloxdOpaqueBehind()` सदा `found = false` लौटाता है।

## 36. अन्य v2 परिवर्तन

- **हुक फॉलबैक**: `bloxdLiquidXxx` अपरिभाषित हो तो तरल प्रोग्राम टेरेन हुकों पर गिरते हैं। **केवल टेरेन हुक पैक जल पर भी ज्यों का त्यों असर करता है**। अनभीष्ट हो तो तरल पक्ष हुक स्पष्ट परिभाषित करें।
- **`BLOXD_LIGHTING` फ़ील्ड रक्षक अनावश्यक**: `blockLight` आदि सभी वेरिएंटों में हैं, अलिट में डिफ़ॉल्ट (0 / 1 / श्वेत / 0) रहते हैं। केवल प्रकाश परीक्षण हेतु `#ifdef BLOXD_LIGHTING` प्रयोग करें। विद्यमान रक्षक रखने से कुछ नहीं बदलता।
- **`BLOXD_ALPHA` परिभाषा शर्त बदली**: गैर-strict टेरेन वेरिएंटों व सभी तरल वेरिएंटों में परिभाषित, strict × टेरेन में अपरिभाषित। टेरेन हुकों में alpha लिखें तो रक्षक रखें।
- **संरचना सीधा निर्माण निषिद्ध**: `BloxdLight(...)` जैसे निर्माता आह्वान स्थैतिक सत्यापन में अस्वीकृत। सदा `bloxdDefault*` से बदलें या निवेश प्रतिलिपि प्रयोग करें।
- **`let _ =` से `_ =`**: WGSL त्याग समनुदेशन `_ = f();` वैध, पर `let _ = f();` अस्वीकृत।
- **offInStrict**: vertex हुक की परिभाषा, या surface / light हुक से पहुँच योग्य `discard` हो तो त्रुटि नहीं, पूरा पैक strict खेलों में स्वतः अक्षम (सेटिंग UI में `shaderPack:offInStrict`; allow खेलों में चलता है)। vertex हुक व `discard` `#ifndef BLOXD_STRICT` से लपेटें। साथ ही आधिकारिक सेटिंग UI संदेश स्वयं कहता है "strict में चलाने हेतु शेष को `#ifndef BLOXD_STRICT` में लपेटें", अतः यह तरीका केवल परंपरा नहीं, आधिकारिक अनुशंसा है।
- **फ़ॉग विस्तार**: फ़ॉग परिकलन LINEAR / EXP / EXP2 विधाएँ कार्यान्वित, पर खेल सेटिंग अब भी सदा LINEAR, अतः विद्यमान फ़ॉग विनिर्देश ज्यों के त्यों चलते हैं। `fogColour` अर्थ अब आधिकारिक दस्तावेज़ित (केवल पूर्णतः फ़ॉगहीन दृश्यों में काला)।
- **अपरिवर्तित**: लिफ्ट वक्र, 35% चैनल तल, heldLight क्षय (`pow(lightDist, 0.75)`) व परिवेश बढ़त, सूर्य/चंद्र दिशा विनिर्देश, डिफ़ॉल्ट फ़ॉग वर्ण, काल लपेटन (3600 सेकंड), दिशात्मक प्रकाश (अधिकतम 4), केवल Lite (WebGPU), संरक्षण तंत्र (IndexedDB), `mod` आरक्षित शब्द।

## 37. v1 → v2 प्रवासन जाँच सूची

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **पहचानकर्ता**: §32 तालिका से सब बदलें (हुक नाम, संरचना नाम, default फ़ंक्शन नाम)
3. **हटाए फ़ील्ड स्थानांतरण**: §33 तालिका से शीर्ष फ़ंक्शनों में (`s.time` → `bloxdTime()` आदि)
4. **`fogFactor` → `fogVisibility`** पुनर्नामकरण
5. **संरचना सीधा निर्माण हटाएँ**
6. **`let _ =` से `_ =`** सुधारें
7. **vertex हुक व discard `#ifndef BLOXD_STRICT` से लपेटें**
8. **जल भी टेरेन हुक प्रभाव अनुभव करता है** सत्यापित करें; अनभीष्ट हो तो liquid हुक स्पष्ट परिभाषित करें
9. (वैकल्पिक) `litColour` से स्वयं फ़ॉग प्रबंधित करें / `bloxdOpaqueBehind()` से जल मोटाई अवशोषण जोड़ें / `blockId` से खंड-विशिष्ट अभिव्यक्ति
10. **दूसरा चरण (ब्राउज़र Tint) भी सत्यापित करें** — विशेषतः `^` `&` `|` `<<` `>>` वाले व्यंजकों के कोष्ठक। स्थैतिक सत्यापन उत्तीर्ण फिर भी ब्राउज़र में अस्वीकृत कोड संभव है (§38)

## 38. दूसरा सत्यापन चरण — ब्राउज़र WGSL कंपाइलर अंतर्निहित पार्सर से कठोर है

खेल का पैक सत्यापन **2-चरण** है। पहला चरण स्थैतिक सत्यापन (इंजन-अंतर्निहित JS पार्सर। हुक हस्ताक्षर, निषिद्ध वाक्यरचना, sceneDepth उपयोग आदि पैक-विशिष्ट नियमों का निरीक्षण) है, दूसरा चरण ब्राउज़र सत्यापन (संकलन परिणाम में संलग्न स्टब का वास्तविक WebGPU कार्यान्वयन से संकलन, त्रुटियों का पैक मूल फ़ाइल पंक्तियों पर प्रतिलोम-मैपिंग सहित प्रदर्शन। UI का "Saved, but it won't run until you fix these errors" यही चरण) है। त्रुटि प्रदर्शन अंत के `(only in terrain)` आदि प्रत्यय "उस त्रुटि वाले वेरिएंट की program किस्म" हैं।

अंतर्निहित पार्सर WGSL संक्रियक बंधन (Binding) नियम लागू नहीं करता, अतः **स्थैतिक सत्यापन उत्तीर्ण होकर भी ब्राउज़र में अस्वीकृत होता है**। क्षति-प्रवण नियत पूर्णांक-हैश प्रतिरूप हैं:

| संक्रियक | परिणाम |
|---|---|
| `<<` `>>` | केवल एकल स्तर तक सीधे बंध सकते हैं। `a + b << c` त्रुटि है |
| `&` `^` `\|` | केवल एकल स्तर तक सीधे बंध सकते हैं। `a * b ^ c` त्रुटि है |
| `&&` `\|\|` | मिश्रण असंभव। `a && b \|\| c` त्रुटि है |

### कोष्ठक लगाने की विधि (NG / OK)

```wgsl
// NG — स्थैतिक सत्यापन उत्तीर्ण पर ब्राउज़र (Tint) अस्वीकृत:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — प्रत्येक गुणन कोष्ठकबद्ध (एक ही संक्रियक की श्रृंखला A ^ B ^ C स्वयं वाम-साहचर्य से वैध)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

इस पुस्तक प्रकाशित कोड में यह प्रतिरूप नहीं है (`pack_hash3` का `+`/`*` मिश्रण व `h ^ (h >> 16u)` कोष्ठकबद्ध होने से विनिर्देश-अनुरूप)। पैक लिखें तो पहला व दूसरा दोनों चरण उत्तीर्ण कराएँ।

## 39. स्वतंत्रतः समान सामग्री विषयक

लगभग समान सामग्री वाली समुदाय सामग्री विद्यमान है: [GlitchHunterCoder/Bloxd-Essay का Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader)। इस गाइड से पहले प्रकाशित, पर **इस गाइड सामग्री glm के Bloxd वास्तविक बंडल फ़ाइलों (webpack खंड समुच्चय) के स्वतंत्र विश्लेषण से है — प्रतिलिपि नहीं**। दोनों मिलते हैं क्योंकि एक ही कार्यान्वयन की स्वतंत्र जाँच समान निष्कर्ष लाती है।

---

शोधकर्ता: ltf_ahel (glm के साथ शोधित)

[← पिछला भाग](07-internals.md)·[मैनुअल पर वापस जाएं](README.md)

[← पिछला भाग](08-apiv2.md)·[मैनुअल पर वापस जाएं](README.md)

# भाग IX: API Version 3 माइग्रेशन गाइड

> **2026-10-26 को प्रतिस्थापित: लाइव API अब संस्करण 4 है** — v3 पैक यहाँ v2 के लिए बताए गए तरीके से ही लोड पर अस्वीकृत होते हैं। इस भाग को लागू करें *और फिर* [भाग X](10-apiv4.md) (v3 → v4: टेक्सचर API, `fogAlpha` नाम-बदलाव, `bloxdFragmentBlockPosition`, `hit`)।

लक्ष्य बिल्ड: `3ymzdd.main.fae4743f.js` — **2026-10-19 से लाइव प्रोडक्शन बिल्ड**। bloxd.io जो बंडल प्रोडक्शन में परोसता है, वह उस प्री-प्रोडक्शन डिप्लॉय से बाइट-दर-बाइट समान है (md5 से जाँचा गया — मुख्य बंडल और शेडर-पैक चंक दोनों), जिस पर यह भाग मूल रूप से शोध किया गया था; इसलिए यहाँ सब कुछ उत्पादन पर जैसा है वैसा ही लागू होता है। पैक मॉडल अपना v2 स्वरूप बनाए रखता है (वही `pack.json` फ़ील्ड, वही लोडर सीमाएँ, वही uniform लेआउट)।

इस गाइड के भाग I–VII अभी भी v2 आधार पर लिखे गए हैं। यह भाग [भाग VIII](08-apiv2.md) के उसी क्रम में v2 → v3 प्रवासन बिंदु और नई v3 सुविधाएँ एकत्र करता है। रूपांतरण अधिकतर यांत्रिक है (§47), पर केवल एक परिवर्तन वास्तव में व्यवहार बदलता है — डिफ़ॉल्ट प्रकाश अब फ़ॉग से emission को क्षीण करता है (§43) — तथा `blockId` को पूरी तरह `blockFlags` से बदल दिया गया है (§42), इसलिए वितरण से पहले हमेशा इन-गेम कंपाइल से सत्यापित करें।

इस संस्करण में नया: अनुभाग **§49–§54** प्रवासन से आगे बढ़कर प्रोडक्शन बिल्ड से पुनः प्राप्त इंजन आंतरिक विवरण देते हैं — Lite रेंडरर वास्तव में आपके हुक कैसे बुलाता है, असली चार-मोड फ़ॉग फ़ंक्शन, `bloxdOpaqueBehind()` का सटीक कार्यान्वयन, ब्लॉक पंजीकरण से आपके हुक तक blockFlags की पूरी डिलीवरी पथ, और मापे गए हेडर हैश सहित सत्यापन पाइपलाइन। ये पैक सिस्टम के बारे में अब तक के सबसे गहरे सार्वजनिक रूप से प्रलेखित तथ्य हैं, और ये कई ऐसे प्रश्नों का समाधान करते हैं जिन्हें अन्य गाइड अभी भी खुले के रूप में सूचीबद्ध करते हैं।

## 40. v2 पैकों का भाग्य (पहले निष्कर्ष)

**अद्यतन 2026-10-19: v3 ने प्री-प्रोडक्शन छोड़ दिया और अब लाइव साइट यही परोसती है।** रोलआउट से पहले सहेजा गया हर v2 पैक — v2 के रूप में वितरित हर पैक सहित — अब उत्पादन पर ठीक वैसे ही विफल होता है जैसा नीचे वर्णित है, इसलिए आज पैक वितरित करने वाले किसी भी व्यक्ति के लिए §47 प्रवासन वैकल्पिक नहीं रह गया है।

यह बिल्ड मैनिफ़ेस्ट `apiVersion` को **ठीक 3 से मेल खाना** आवश्यक बनाता है, और **समानांतर v2/v3 समर्थन नहीं है**। v2 पैक लोड पर "गलत API संस्करण" संदेशों के साथ अस्वीकृत होता है (i18n कुंजियाँ, प्लेसहोल्डर टेक्स्ट):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

सहेजे गए पैक v2 जीवनचक्र बनाए रखते हैं ([भाग VIII](08-apiv2.md) §31): हर बिल्ड अपने इंजन हेडर का हैश बनाता है, इंजन अद्यतन सहेजे गए पैक को स्वतः "needs re-check" चिह्नित करते हैं, और जिस सहेजे गए पैक का `apiVersion` वर्तमान के अलावा कोई भी संस्करण हो वह त्रुटि देने के बजाय won't-run चिह्नित होता है (ऊपर का स्टेटस संदेश प्रतिस्थापन की ओर इंगित करता है)।

## 41. pack.json और uniform बफ़र (क्या अपरिवर्तित रहता है)

- आवश्यक मैनिफ़ेस्ट फ़ील्ड अपरिवर्तित हैं: `{ apiVersion, name, author }`।
- लोडर सीमाएँ अपरिवर्तित हैं: 32MB zip / 1024 प्रविष्टियाँ / 256 `.wgsl` फ़ाइलें / कुल 256KB कोड / 64KB मैनिफ़ेस्ट।
- इंजन uniform ब्लॉक का आकार अपरिवर्तित है: `@group(3) @binding(0)`, 64 B, जिसमें घोषणा क्रम में समय, render offset, सूर्य दिशा और eye position रखे हैं। लेआउट `minBindingSize: 64` के साथ पंजीकृत है, और सटीक फ़ील्ड लेआउट है `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48। दो आंतरिक फ़ील्ड नाम बदले: `time` → `seconds`, `originOffset` → `renderOffset`। **बाइट लेआउट v2 जैसा ही है**, और पैक कोड के लिए वैसे भी कुछ नहीं बदलता, क्योंकि पैक uniform को सीधे नाम नहीं दे सकते (इंजन हेडर इसे engine-provided और read-only चिह्नित करता है, "which packs can't name"); हेडर फ़ंक्शन `bloxdSeconds()` / `bloxdRenderOffset()` से ही काम करते रहें।
- पैक के group 3 में एक प्रलेखित दूसरा स्थान जुड़ा: `@group(3) @binding(1)` वह scene-depth texture है जिसे `bloxdOpaqueBehind()` पढ़ता है (पूरा कार्यान्वयन §51 में)। 64 B का uniform binding 0 पर ही रहता है; पैक अभी भी दोनों binding को नाम नहीं दे सकते।

## 42. blockId से blockFlags: प्रति-ब्लॉक सामग्री बिट फ़्लैग के रूप में (मुख्य)

तीनों हुक इनपुट संरचनाओं (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) में v2 फ़ील्ड `blockId: u32` को **बदलकर** `blockFlags: u32` कर दिया गया है। फ़ील्ड पर इंजन टेक्स्ट: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* अब इंजन सामग्री डेटा स्वयं भेजता है, इसलिए संख्यात्मक id श्रेणियों से सामग्री अनुमान लगाने या दुनिया में id तालिकाएँ बनाए रखने का v2 तरीका ([भाग VIII](08-apiv2.md) §34) अब आवश्यक नहीं है।

बिट्स नामित स्थिरांक के रूप में उपलब्ध हैं:

```wgsl
// इसका परीक्षण (blockFlags & bloxdBlockFlagRock) != 0 से करें।
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| मान | स्थिरांक | अर्थ (इंजन नोट्स, संक्षिप्त) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | पूरी तरह अपारदर्शी — पत्ते और बर्फ़ भी शामिल। काँच, पानी, लावा, spawners, या ghost और invisible ब्लॉक नहीं। |
| 2 | `bloxdBlockFlagEmissive` | ब्लॉक प्रकाश देता है, जैसे neon, portals, lamps, Lava और Beacon देते हैं। चमकते अयस्क भी गिने जाते हैं, चाहे कितने ही मंद हों। |
| 4 | `bloxdBlockFlagVegetation` | पत्ते, और घास-ब्लॉकों पर की घास — जो dirt भी हैं। कैक्टस, मशरूम ब्लॉक या hay नहीं। |
| 8 | `bloxdBlockFlagDirt` | Dirt और soil, घास-ब्लॉक सहित। Rocky Dirt rock भी है। |
| 16 | `bloxdBlockFlagSand` | Sand, Red Sand, और हर sandstone — जो rock भी है। |
| 32 | `bloxdBlockFlagRock` | Stone और उसके प्रकार, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian और magma। |

कई सामग्रियों से बना ब्लॉक **हर** मेल खाता flag रखता है (इंजन का अपना उदाहरण: sandstone sand और rock दोनों है, इसलिए उसे दोनों मिलते हैं)। पत्ते vegetation हैं पर dirt नहीं; घास-ब्लॉक एक साथ vegetation और dirt हैं।

vegetation / dirt / sand / rock flags ब्लॉक के पंजीकृत **प्रदर्शित नाम (display name)** से असाइन होते हैं (opaque / emissive इसके बजाय इंजन के अपने opacity और emission डेटा से आते हैं): `Leaves` पर समाप्त होने वाले नाम, या `Grass Block`, vegetation हैं; `Dirt` / `Soil` नाम (और हर `Grass Block`) dirt हैं; ठीक `Sand` और `Red Sand`, साथ ही `Sandstone` वाला कोई भी नाम sand हैं; `Stone` / `Andesite` / `Diorite` / `Granite` वाले नाम, कोई भी `Ore`, साथ ही Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (और sandstone) rock हैं।


### सटीक नाम-नियम (किसी भी ब्लॉक के flags स्वयं निकालें)

चार सामग्री बिट ब्लॉक के पंजीकृत प्रदर्शित नाम पर एक निश्चित वर्गीकरणकर्ता से आते हैं। पहले वेरिएंट नाम (`|` के बाद का सब कुछ) हटा दिए जाते हैं, इसलिए वेरिएंट आधार ब्लॉक के flags विरासत में लेते हैं। फिर:

| बिट | नियम (छीनें गए नाम पर लागू) |
|---|---|
| vegetation | नाम **` Leaves` पर समाप्त** होता है, या **` Grass Block` पर समाप्त** होता है |
| dirt | नाम **ठीक `Dirt` है**, **` Dirt` या ` Soil` पर समाप्त** होता है, या **` Grass Block` पर समाप्त** होता है |
| sand | नाम **ठीक `Sand` या `Red Sand` है**, या **`Sandstone` शामिल** है |
| rock | नाम **ठीक इनमें से एक है** `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **`Sandstone` शामिल** है, **` Ore` पर समाप्त** होता है, या `Stone` / `Andesite` / `Diorite` / `Granite` को अलग शब्द के रूप में शामिल करता है |

Yellowstone स्पष्ट रूप से सूचीबद्ध है क्योंकि `Yellowstone` के भीतर `Stone` अलग शब्द नहीं है। Opaque और emissive नाम से **नहीं** आते — वे इंजन के अपने opacity और block-light-emission डेटा से आते हैं, इसलिए इन नियमों से उन्हें निकाला नहीं जा सकता।

स्रोत: इंजन का नाम वर्गीकरणकर्ता (module 28537, बंडल `3ymzdd`); सभी 7,861 नामित ब्लॉकों के विरुद्ध सत्यापित, 2026-10-20।

उदाहरण — सामग्री के अनुसार प्रति-ब्लॉक टिंट:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 रेसिपी पर प्रभाव: R-H की 22-प्रविष्टि leaf-id सरणी ([भाग VIII](08-apiv2.md) §34) सिकुड़कर `(blockFlags & bloxdBlockFlagVegetation) != 0` रह जाती है। [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) पर id ↔ block-name संदर्भ गैर-शेडर उद्देश्यों के लिए उपयोगी रहता है, पर सामग्री स्टाइलिंग के लिए अब दुनिया में lookup की आवश्यकता नहीं।

### घास के बिना पत्ते (वह प्रश्न जो सब पूछते हैं)

`vegetation` अकेला पत्तों **और** घास-ब्लॉकों की घास दोनों से मेल खाता है, जो `dirt` भी रखते हैं। केवल पत्ते हिलाने के लिए dirt को बाहर रखें — यही भेद इंजन के अपने फ़ील्ड नोट्स में स्पष्ट है:

```wgsl
// केवल पत्ते: dirt के बिना vegetation। घास-ब्लॉक vegetation AND dirt हैं।
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// केवल घास-ब्लॉक (टेरेन surface के घास वाले फलक):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

लाइव रजिस्ट्री के विरुद्ध सत्यापित (2026-10-20, बंडल `3ymzdd`): `vegetation && !dirt` ठीक 45 leaf registrations से मेल खाता है (22 आधार प्रकार — वही 22 जो v2 R-H id सरणी ने मापे थे); `vegetation && dirt` ठीक 8 grass blocks से मेल खाता है। किसी भी दिशा में कोई अपवाद नहीं — रजिस्ट्री गणनाएँ उस बिल्ड के अनुसार; नए ब्लॉक संख्याएँ बढ़ाते हैं, नियम नहीं बदलते। फलक चुनने के लिए `vertex.normal` (up/down) के साथ जोड़ें, जैसे केवल घास-ब्लॉक के ऊपरी फलक।

## 43. फ़ंक्शन पुनर्नामकरण और अर्थगत परिवर्तन

| v2 | v3 | टिप्पणियाँ |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | पेज लोड होने के बाद से सेकंड (नीचे f32 परिशुद्धता नोट) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | वही मात्रा: render position + यह = world position |
| `const bloxdTimeWrap: f32 = 3600` | **हटाया गया** | अवधि पैक पक्ष पर स्वयं परिभाषित करें |
| `engineColour` (`BloxdLightIn` में) | **हटाया गया** (14 → 13 फ़ील्ड) | `litColour` + फ़ॉग से पुनर्निर्माण करें |
| हुक पैरामीटर `v` / `s` / `l` | `vertex` / `surface` / `light` | टेम्पलेट वर्तनी; हस्ताक्षर अपरिवर्तित |

- **`bloxdSeconds()`** — पेज लोड होने के बाद से सेकंड। f32 में यह पहले 4.5 घंटे तक 1 ms से कम के चरणों में गिनता है, और 9 से 18 घंटे तक लगभग 4 ms के चरणों में। हेडर `bloxdSeconds() % period` मुहावरा सुझाता है, जो 0 से `period` तक गिनकर फिर शुरू हो जाता है — हटाए गए wrap स्थिरांक का साफ़ प्रतिस्थापन।
- **`bloxdRenderOffset()`** — पूरे ब्लॉक: "a render position plus this is a world position." यह खिलाड़ी के यात्रा करने पर बदलता है, इसलिए render positions खिलाड़ी के पास रहते हैं — और इसलिए सटीक। पूरी गाइड में, जिसे v2 पाठ noa-local offset कहता था, अब लगातार **render position** / render offset कहा जाता है; यह वही मात्रा है जो `bloxdOriginOffset()` लौटाता था।
- **`bloxdTimeWrap` हटाया गया** — जो पैक 3600 s पर समय wrap करता था, अब अपना स्थिरांक घोषित करे, जैसे `const timeWrap: f32 = 3600.0;` और `% timeWrap`.
- **डिफ़ॉल्ट प्रकाश अर्थ-विज्ञान** — v2 का डिफ़ॉल्ट `engineColour + emission × fogVisibility` था; v3 डिफ़ॉल्ट इसे `bloxdApplyFog(litColour + emission, light)` के रूप में बनाता है — **अब डिफ़ॉल्ट के भीतर emission को फ़ॉग क्षीण करता है**, इसलिए संयुक्त आउटपुट एक साथ फ़ॉग blend से गुजरता है। पोर्ट तालिका:

  | v2 अभिव्यक्ति | v3 पोर्ट |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 पठन `l.engineColour + s.emission * l.fogVisibility` का v3 पोर्ट:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **नाम और अर्थ में अपरिवर्तित**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. नए हेडर स्थिरांक: `bloxdPi` और `bloxdTau`

```wgsl
// आधा घुमाव और पूरा घुमाव, रेडियन में।
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

त्रिकोणमिति जादू के लिए उपयोगी, और इसलिए भी कि पैकों को अब π हार्डकोड नहीं करना पड़ता। नाम पुनःउपयोग पर ध्यान दें: उसी नाम का पैक-लोकल स्थिरांक अब हेडर के duplicate-identifier जाँच से टकराता है — अपने कोड में कोई भी `bloxdPi` / `bloxdTau` पुनःघोषणा हटाएँ या नाम बदलें।

## 45. छह-हुक टेम्पलेट (liquid हुक आधिकारिक रूप से दिखाए गए)

बिल्ड के साथ प्रकाशित डिफ़ॉल्ट पैक टेक्स्ट अब **सभी छह हुक** शामिल करता है — terrain / liquid × vertex / surface / light — और प्रत्येक अपना इंजन डिफ़ॉल्ट लौटाता है। इंजन टिप्पणियाँ इसे इस तरह पेश करती हैं: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// हर हुक अपना इंजन डिफ़ॉल्ट लौटाता है। शेडर पैक शुरू करने के लिए
// हुक को कॉपी करें और उसका आउटपुट बदलें।

// Strict गेम टेरेन को वहीं रखते हैं: बिना guard के यह हुक वहाँ
// पूरा शेडर पैक बंद कर देगा।
#ifndef BLOXD_STRICT
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

// पानी इनका उपयोग करता है। हटाने पर पानी आपके terrain हुक का उपयोग करता है।
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
```

- हुकों की टिप्पणियाँ liquid नियम सीधे बताती हैं: **पानी को तीनों की आवश्यकता है; इसे हटाएँ और पानी आपके terrain हुक का पुनः उपयोग करता है** (v2 से ज्ञात fallback व्यवहार, [भाग VIII](08-apiv2.md) §36, अब टेम्पलेट में ही लिखा हुआ)।
- `bloxdLiquidVertex` वही `#ifndef BLOXD_STRICT` guard में है जो `bloxdTerrainVertex` में — बिना guard यह strict गेम में पूरा पैक बंद कर देगा, ठीक वैसे ही जैसे terrain-side vertex प्रभाव करते हैं।
- टेम्पलेट वर्तनी अब पूरे पैरामीटर नाम `vertex` / `surface` / `light` हैं (v2 टेम्पलेट छोटे `v` / `s` / `l` वाले थे)। आपके कोड के पैरामीटर नाम स्वतंत्र हैं — केवल हस्ताक्षर मायने रखते हैं।

## 46. वेरिएंट मैट्रिक्स: प्रोग्राम अक्ष और मैक्रो परिवर्तन

वेरिएंट **strict × lighting × program** के मैट्रिक्स पर बनते हैं — v2 जैसे ही 8 संयोजन, पर अब terrain / liquid मैट्रिक्स का स्पष्ट अक्ष है। वेरिएंट नाम इसे `allow|strict · unlit|lit · terrain|liquid` के रूप में लिखते हैं, और UI में ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` के रूप में दिखते हैं (और त्रुटि प्रदर्शन "(only in {{variants}})" जोड़ सकते हैं)।

| मैक्रो | कहाँ परिभाषित |
|---|---|
| `BLOXD_STRICT` | strict वेरिएंट (दोनों प्रोग्राम) |
| `BLOXD_LIGHTING` | lighting-on वेरिएंट (दोनों प्रोग्राम) |
| `BLOXD_ALPHA` | **सभी liquid वेरिएंट** तथा non-strict **terrain** वेरिएंट |
| `BLOXD_SCENE_DEPTH` | **सभी liquid वेरिएंट** |

लेखकों के लिए v2 नियमों की तुलना में दो बातें बदलती हैं ([भाग VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` v2 से अपरिवर्तित है।** वेरिएंट जनरेटर में शाब्दिक पंक्ति `"liquid"!==program&&strict||push("BLOXD_ALPHA")` है — JS ऑपरेटर प्राथमिकता के कारण *(terrain **और** strict)* ही एकमात्र ऐसा मामला है जो push छोड़ता है, इसलिए मैक्रो **हर liquid वेरिएंट (strict या non-strict) और non-strict terrain** में परिभाषित है; केवल strict terrain इसे छोड़ता है। Liquid-side `#ifdef BLOXD_ALPHA` कोड ठीक वैसे ही संकलित होता है जैसे हमेशा होता था, और §49 का alpha write-back (liquid प्रोग्राम या non-strict वेरिएंट के लिए splice) इस सेट से ठीक मेल खाता है।
- **`BLOXD_SCENE_DEPTH` liquid वेरिएंट में हमेशा परिभाषित है**, इसलिए वहाँ depth उपयोग बिना guard ठीक है, ठीक v2 (§35) की तरह; terrain हुक में इसे अभी भी `#ifdef BLOXD_SCENE_DEPTH` में लपेटना होगा।

## 47. v2 से v3 प्रवासन जाँच सूची

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** तीनों इनपुट संरचनाओं में; सामग्री स्टाइलिंग को `bloxdBlockFlag*` स्थिरांकों के विरुद्ध बिट परीक्षणों के रूप में लिखें (§42); v2 के id-श्रेणी अनुमान हटाएँ
3. **`bloxdTime()` → `bloxdSeconds()`**; हटाए गए `bloxdTimeWrap` के बजाय अपनी अवधि घोषित करें (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **प्रकाश गणित को `engineColour` से `litColour` + फ़ॉग पर पुनर्निर्मित करें** §43 की तालिका के अनुसार; ध्यान दें कि डिफ़ॉल्ट अब emission को फ़ॉग से क्षीण करता है
6. **Liquid हुक**: जब आप पानी को अलग तरह से संभालना चाहें तब `bloxdLiquid*` स्पष्ट रूप से परिभाषित करें; छोड़ने पर आपके terrain हुक पर fallback होता है
7. **`BLOXD_ALPHA` audit की आवश्यकता नहीं** — इसका वेरिएंट सेट v2 से अपरिवर्तित है: सभी liquid वेरिएंट तथा non-strict terrain इसे परिभाषित करते हैं, केवल strict terrain इसे छोड़ता है (§46)
8. **`bloxdPi` / `bloxdTau` का उपयोग करें** जहाँ त्रिकोणमिति-संबंधी स्थिरांक हार्डकोड थे; अब हेडर की नकल करने वाली पैक-लोकल पुनःघोषणाएँ हटाएँ
9. **Strict guards रखें**: vertex हुक और `discard` `#ifndef BLOXD_STRICT` में लिपटे रहें; टेम्पलेट `bloxdLiquidVertex` को terrain की तरह ही guard करता है
10. **इन-गेम सत्यापित करें** — जिस खेल में शेडर पैक समर्थित हों उसमें पैक को कंपाइल और परखें

## 48. अन्य v3 परिवर्तन और टिप्पणियाँ

- **सत्यापन दो-चरणीय रहता है** ([भाग VIII](08-apiv2.md) §38): पहले स्थिर सत्यापन, फिर ब्राउज़र का असली WebGPU कंपाइल, जो आपके हुक बुलाने वाले उत्पन्न स्टब स्निपेट के ज़रिए होता है; त्रुटियाँ स्रोत फ़ाइलों / पंक्तियों पर मैप होती हैं, और डायग्नोस्टिक्स मैपिंग के ज़रिए इंजन-पक्ष के पहचानकर्ताओं के मूल नाम बहाल करते हैं।
- **Strict डायग्नोस्टिक्स कारण बताते हैं**: terrain हिलाने वाला vertex हुक रिपोर्ट करता है "… moves terrain, which strict games prevent." और surface / light हुक में `discard` रिपोर्ट करता है "discard makes terrain see-through, which strict games prevent."; सेटिंग्स UI मार्गदर्शन "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." (`offInStrict`) बनाए रखता है।
- **लोडर संदेश**: त्रुटि प्रकार और सीमाएँ अपरिवर्तित; "Zip64 archives aren't supported." UI संदेश (`loadZip64`) के रूप में सामने आता है। पैक-UI स्ट्रिंग सूची में कुल 57 `shaderPack:*` कुंजियाँ हैं; load-चरण त्रुटियों में `loadNoWgsl` (शून्य `.wgsl` फ़ाइलों वाला zip) और `loadNotZip` (zip end-of-archive signature के बिना फ़ाइल) सेट पूरा करते हैं।
- **पैक UI के साथ कोई इन-गेम WGSL संपादक नहीं आता।** सेटिंग्स स्क्रीन कोई शेडर कोड संपादक नहीं देती — पैक खेल के बाहर zip फ़ाइलों के रूप में लिखे जाते हैं। (बंडल में CodeMirror संपादक मौजूद है, पर वह कस्टम-गेम स्क्रिप्टिंग UI का JavaScript संपादक है; उसमें WGSL समर्थन नहीं है और पैक सिस्टम से कोई संबंध नहीं।)
- **हार्डवेयर गेट**: Lite के लिए `shader-f16` WebGPU सुविधा समर्थित ड्राइवर चाहिए; बहुत पुराने ड्राइवर "Intel driver too old for Lite (no shader-f16)" जैसे संदेश से अस्वीकृत होते हैं।
- **प्रकाश सेटिंग बदलने पर सहेजे पैक पुनः सत्यापित होते हैं**: रन टाइम पर lighting सेटिंग बदलने पर इंजन पैक जाँच पुनः चलाता है (`changed → recheck`); replay देखना उसी हुक को `changed: false` के साथ बुलाता है और पुनः-जाँच छोड़ देता है।
- **शब्दावली**: शेडर पैक स्वीकार करने वाले खेलों के बारे में टेक्स्ट अब "in games that **support** them" पढ़ता है।
- **टाइटल का दायरा**: जिन खेलों में पैक चलते हैं, उनका सेट पिछले बिल्ड से अपरिवर्तित है।

## 49. इंजन आंतरिक: Lite रेंडरर आपके हुक कैसे बुलाता है

§40–§48 का सब कुछ वही है जो लोडर और हेडर आपको बताते हैं। यह अनुभाग और इसके बाद के चार, यह प्रलेखित करते हैं कि इंजन रन टाइम पर वास्तव में क्या करता है, जो प्रोडक्शन बंडल से बहाल किया गया है (Lite रेंडरर — 175 KB का चंक; integration स्रोत फ़ाइल का असली नाम `lite/terrainShaderPack.ts` उसके error strings के भीतर बचा है)। इसमें से कुछ भी आप जो लिखते हैं उसे नहीं बदलता, पर यह इस अनुमान को हटाता है कि आपके हुक क्या प्राप्त करते हैं — और यह कई ऐसे प्रश्नों को सुलझाता है जिन्हें अन्य सामुदायिक गाइड अभी भी खुले के रूप में सूचीबद्ध करते हैं।

रेंडरर JavaScript से आपके हुक "कॉल" नहीं करता। जब पैक सत्यापन पास करता है, इंजन अपने shader टेक्स्ट की fixed anchor lines बदलकर आपके हुक कॉल को अपने ही terrain WGSL में **splice** करता है। एक anchor ठीक एक बार मेल खाना चाहिए — शून्य या एक से अधिक मैच `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` के साथ abort करते हैं।

| चरण | इंजन shader में anchor पंक्ति | क्या splice होता है |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` से `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` तक का चार-पंक्ति ब्लॉक | `BloxdVertexIn` बनाएँ, आपका vertex हुक बुलाएँ, `worldPos` वापस लिखें — splice `let worldPos` को `var worldPos` में भी बदलता है |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` बनाएँ, आपका surface हुक बुलाएँ, `baseColor` / `alpha` वापस लिखें |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` से ठीक पहले | `let bloxdSpLitColour = color.rgb;` — फ़ॉग-पूर्व रंग कैप्चर करता है |
| light | fragment shader की अंतिम `return color;` पंक्ति | `BloxdLightIn` बनाएँ, आपका light हुक बुलाएँ, `color` वापस लिखें — फ़ॉग mix के बाद |

splice किया गया कोड, भेजे गए बंडल से बहाल (light-level sample expressions संक्षिप्त जहाँ इंजन की अपनी formatting लंबी चलती है):

```wgsl
// vertex चरण — vertex हुक वाले non-strict वेरिएंट
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment चरण — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // केवल तब splice होता है जब प्रोग्राम liquid हो या वेरिएंट non-strict हो
```

```wgsl
// fragment चरण — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* light-level varying */.rgb,           // blockLight
        /* sky channel of the same varying */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* held-light term (see below) */,       // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — केवल तब काला जब बिल्कुल फ़ॉग न हो
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

इस splicing से चार प्रवर्तन-तथ्य सीधे निकलते हैं:

- **Strict terrain surface-हुक alpha परिवर्तनों को अनदेखा करता है।** `alpha = bloxdSpSurface.alpha` write-back केवल liquid प्रोग्राम या non-strict वेरिएंट के लिए splice होता है — यही §46 की मैक्रो तालिका के पीछे का कार्यान्वयन है। (strict terrain में आपका `#ifdef BLOXD_ALPHA` कोड वैसे भी संकलित नहीं होता; अब यह भी पुष्ट है कि बिना guard वाले alpha writes वहाँ गिरा दिए जाते हैं।)
- **जो strict वेरिएंट अभी भी vertex हुक घोषित करता है, उसे कभी नहीं चलाया जाता** — इंजन build time पर रिपोर्ट करता है: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. इसीलिए आधिकारिक टेम्पलेट (§45) `bloxdLiquidVertex` को उसके terrain जुड़वाँ की तरह उसी `#ifndef BLOXD_STRICT` में लपेटता है।
- `bloxdSp*` पहचानकर्ता — **कुल 14**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — इंजन-पक्ष temporaries हैं। आपका कोड उन्हें कभी नहीं देखता, पर वे diagnostics और किसी के भी reverse-engineering output में सामने आते हैं, इसलिए उन्हें देखते ही पहचानना उपयोगी है।
- **डिफ़ॉल्ट-surface शॉर्टकट।** जब किसी वेरिएंट का surface हुक शाब्दिक रूप से `bloxdDefaultSurface` हो, तो इंजन `baseColor` / `alpha` write-back पंक्तियाँ splice करना पूरी तरह छोड़ देता है — डिफ़ॉल्ट वे मान पहले ही पैदा करता है, इसलिए assignment मृत कोड होता। असंशोधित हुक शृंखलाओं पर कोई लागत नहीं।

**`BloxdLightIn` को वास्तव में क्या भेजता है** — splice किए गए कोड से, फ़ील्ड दर फ़ील्ड:

| फ़ील्ड | इंजन-पक्ष स्रोत |
|---|---|
| `litColour` | फ़ॉग mix से ठीक पहले कैप्चर किया गया fragment रंग (`bloxdSpLitColour` anchor) — "before emission and fog", जैसा हेडर कहता है |
| `directional` | `vTerrainLambert` — scene के दिशात्मक प्रकाशों पर `max(0, dot(normal, lightDirection)) × intensity` का vertex-interpolated योग (§54 में सूत्र); scene में कोई न हो तो 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — प्रति सामग्री, प्रति फ़्रेम |
| `blockLight` | decoded light-level varying का `.rgb` (§54 में decode) |
| `skyLight` | उसी light-level varying का sky channel — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (हेडर टेक्स्ट) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | हस्त-प्रकाश पद, जो light-level varying के w चैनल और `uHeldLightPos` / `uHeldLightColour` फ़्रेम uniform से बनता है ([भाग VII](07-internals.md) §26 falloff और channel-floor व्यवहार प्रलेखित करता है) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **केवल ऐसे scene में काला जहाँ बिल्कुल फ़ॉग नहीं** (मोड 0, §50) |
| `fogVisibility` | clamp किया गया फ़ॉग गुणांक — ठीक वही मान जो §50 का फ़ंक्शन लौटाता है |
| `position` / `normal` | `vPositionW` / `vNormalW` varyings (normal प्रति fragment पुनः सामान्यीकृत) |
| `blockFlags` | `vBlockFlags` flat varying — §52 का पूरा delivery path |

पुरानी सामग्री पढ़ते समय दिशा-निर्देश के लिए: वही splicing architecture v2 रेंडरर में मौजूद थी, और v3 के केवल integration अंतर `vBlockId` → `vBlockFlags` और जोड़े गए liquid वेरिएंट हैं। हुक सिस्टम v2 → v3 break के पार architectural रूप से स्थिर है।

## 50. फ़ॉग फ़ंक्शन: चार मोड, एक फ़ील्ड

प्रोडक्शन terrain shader से शब्दशः बहाल:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // रैखिक
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // चरघातांकी
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // चरघातांकी वर्ग
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = फ़ॉग बंद (गुणांक 1.0 रहता है)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — एक vec4 सब कुछ नियंत्रित करता है।
- **शेडर में चार मोड मौजूद हैं: 0 = बंद, 1 = चरघातांकी, 2 = चरघातांकी-वर्ग, 3 = रैखिक।** `fogVisibility` clamp किया गया गुणांक है, चाहे कोई भी मोड चले — ठीक एक फ़ील्ड है, और कोई mode flag कभी पैकों को उजागर नहीं होता।
- Bloxd के अपने टाइटल मोड 3 (रैखिक) को [भाग VII](07-internals.md) §25 में वर्णित 32-ब्लॉक पट्टी के साथ चलाते हैं (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), इसलिए उस भाग का "सदा रैखिक" अवलोकन अभी भी भेजे गए गेमप्ले का वर्णन करता है। पर exponential मोड असली, जीवित इंजन कोड हैं — कोई टाइटल `vFogInfos.x` बदलकर बिना किसी क्लाइंट अपडेट के रैंप बदल सकता है। दूरी-आधारित लुक लिखने का मज़बूत तरीका वे दूरी रेसिपी हैं जो `distance(l.position, bloxdEyePosition())` स्वयं गिनती हैं (रेसिपी R-B), क्योंकि मोड बदलने से उन्हें हिलाया नहीं जा सकता।
- यह स्रोत से ही "इंजन वास्तव में कौन-सा फ़ॉग रैंप उपयोग करता है" प्रश्न तय कर देता है: चारों कार्यान्वित हैं; भेजे गए टाइटल रैखिक उपयोग करते हैं। (यही फ़ंक्शन हेडर की fogColour टिप्पणी भी समझाता है — मोड 0 ही एकमात्र स्थिति है जहाँ `fogColour` काला आता है, और Bloxd के खेल कभी मोड 0 नहीं भेजते; वे इसके बजाय फ़ॉग को बहुत दूर धकेल देते हैं, [भाग VII](07-internals.md) §25।)

## 51. bloxdOpaqueBehind(): सटीक कार्यान्वयन

पूरा फ़ंक्शन, प्रोडक्शन बिल्ड से शब्दशः बहाल:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **Depth texture `@group(3) @binding(1)` पर रहती है** — group 3 पैक का अपना group है: binding 0 64 B का `bloxdPackInputs` uniform है (§41), binding 1 यह depth texture है। दोनों इंजन-प्रदत्त हैं और आपकी ओर से अनाम हैं।
- **Depth texture एक unfilterable-float, केवल-fragment संसाधन है।** bind-group लेआउट इसे `texture: { sampleType: "unfilterable-float" }` के रूप में केवल `GPUShaderStage.FRAGMENT` दृश्यता के साथ पंजीकृत करता है — इसीलिए `bloxdOpaqueBehind()` `textureSample` के बजाय `textureLoad` (स्पष्ट texel निर्देशांक, mip level 0) पर बना है: इस texture पर हार्डवेयर फ़िल्टरिंग उपलब्ध ही नहीं है।
- `z ≤ 0` का अर्थ है depth सैंपल को कुछ नहीं मिला (far plane / आकाश): `found = false`, और `position` / `distance` का कोई अर्थ नहीं — हमेशा पहले `found` जाँचें।
- लौटाई गई स्थिति एक **ray-scale प्रतिच्छेद** है: अपारदर्शी सतह `eye + (fragment − eye) × max(z / viewDepth, 1)` पर रखी जाती है। `distance` आँख से उस बिंदु तक मापी जाती है — पानी-सतह पैकों के लिए यह व्यावहारिक रूप से "किरण ठोस चीज़ से टकराने से पहले कितना पानी पार कर चुकी है" है, और यही गहराई-रंग वाली पानी रेसिपी को बिना दूसरे depth buffer के काम करने देता है।

## 52. blockFlags एंड-टू-एंड: पंजीकरण से आपके हुक तक

§42 बताता है कि बिट्स का अर्थ क्या है। यह अनुभाग वह पूरा पथ है जो एक flag बिट ब्लॉक पंजीकरण से आपके हुक तक तय करता है — हर चरण प्रोडक्शन स्रोत से पुष्ट, जो हेडर के "the same across the face" को बाइट स्तर तक सिद्ध करता है।

**1. पंजीकरण (block-definition डेटाबेस)।** हर ब्लॉक के flags पंजीकरण के समय एक बार गिने जाते हैं:

```js
flags[id] = nameFlags                     // display-name नियम (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // opaque बिट — इंजन opacity डेटा
          | (anyFaceEmission >= 1       ? 2 : 0);  // emissive बिट — block-light emission डेटा
```

display-name नियम केवल चार सामग्री बिट कवर करते हैं; दो भौतिकी बिट अलग इंजन डेटा से आते हैं — `opaque` सीधे block definition से, `emissive` प्रति-फलक block-light emission सरणी से। हेडर का "Glowing ores count, however faint" शब्दशः सच है: emission ≥ 1 वाला कोई भी फलक बिट सेट करता है।

**2. प्रति-ब्लॉक → प्रति-सामग्री (mesher initialization)।** टेरेन प्रति *सामग्री* खींचा जाता है, प्रति ब्लॉक id नहीं, इसलिए flags को material तालिका में पुनः सारणीबद्ध किया जाता है (एक `Uint16Array` जो material id से अनुक्रमित है, और हर सामग्री अपने स्वामी ब्लॉक के पहले फलक के flags लेती है)। तालिका meshing Web Worker तक जाती है — पर **केवल उन configurations में जहाँ पैक पाइपलाइन सक्षम है**; अन्यथा तालिका `null` रहती है और कोई flag बाइट कभी नहीं लिखी जाती। बिना पैक वाले खिलाड़ी संरचना से ही शून्य overhead देते हैं।

**3. Vertex बाइट्स में (mesher worker)।** flags मौजूदा interleaved vertex डेटा के दो खाली बाइट में सवार होते हैं:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // निम्न 8 बिट → रंग गुण का alpha बाइट
        buffer[o + normalOffset + 3] = flags >> 8;    // उच्च 8 बिट → normal गुण का w बाइट
    }
}
```

किसी फलक के चारों vertices को वही मान मिलता है — "the same across the face" का कार्यान्वयन-स्तरीय अर्थ।

**4. GPU-पक्ष decode (Lite terrain shader)।** दोनों बाइट `blockFlagWords: vec2u` vertex attribute के रूप में यात्रा करते हैं (location 7, केवल तब मौजूद जब पैक पाइपलाइन चालू हो) और vertex चरण में पुनः जोड़े जाते हैं:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` को `@interpolate(flat)` घोषित किया गया है — fragment चरण तक प्रति-फलक स्थिर, इसीलिए §42 के बिट परीक्षण एक फलक के भीतर स्थिर रहते हैं और कभी मध्य-फलक blend नहीं बना सकते।

- पाइपलाइन **16 बिट** क्षमता आरक्षित रखती है (वह decode दो पूरे बाइट पुनः जोड़ता है) जबकि v3 केवल 6 परिभाषित करता है — भविष्य के flags बिना दूसरे vertex-format परिवर्तन या API bump के आ सकते हैं।
- Packed-vertex मोड में वही दो बाइट समर्पित attribute के बजाय `packed.y` और रंग शब्द के ऊपरी बाइट के भीतर सवार होते हैं — वही मान, अलग container।
- पत्ते-बनाम-घास के उस प्रश्न के लिए जिसके बारे में ये flags सबसे अधिक पूछे जाते हैं, §42 के अंतर्गत [घास के बिना पत्ते](#घास-के-बिना-पत्ते-वह-प्रश्न-जो-सब-पूछते-हैं) देखें।

## 53. सत्यापन आंतरिक: HEADER_VERSION, हस्ताक्षर, आरक्षित नाम

**मापा गया हेडर हैश।** हर पैक सत्यापन पर इंजन का `HEADER_VERSION` अंकित होता है। प्रोडक्शन validation मॉड्यूल को सीधे चलाकर (§54 के अंत में हार्नेस नोट देखें) इसे मापा जाता है:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← लाइव प्रोडक्शन बंडल से मापा गया
```

यह पाँच इनपुटों पर एक FNV-1a-32 हैश है (`6.` उपसर्ग के साथ): इंजन हेडर जो **प्रति वेरिएंट** प्रीप्रोसेस और टोकनाइज़ होता है (आठ में से हर वेरिएंट के लिए एक प्रविष्टि), पार्सर का पूरा WGSL लेक्सिकल यूनिवर्स, चार मैक्रो नाम, विशेष-फ़ंक्शन मैप, और `BloxdPackInputs` घोषणा उसकी `@group(3) @binding(0)` uniform पंक्ति के साथ। लेखकों के लिए दो परिणाम:

- **इंजन-पक्ष का कोई भी हेडर संपादन इसे पुनः हैश करता है** — यही इंजन अद्यतन के बाद सहेजे गए पैकों को मिलने वाले स्वतः "needs re-check" flag के पीछे का तंत्र है ([भाग VIII](08-apiv2.md) §31)।
- हैश *इंजन हेडर* को कवर करता है, आपके कोड को नहीं। जो पैक इंजन अद्यतन के पार लोड होता रहता है वह "अभी भी वैध" नहीं है — उसने बस अभी तक हेडर परिवर्तन नहीं छुआ है। आपका मैनिफ़ेस्ट केवल `apiVersion` गेट में ही संस्करण जाँच में भाग लेता है (§40)।

**हुक हस्ताक्षर जाँच: प्रकारों पर टोकन-सटीक, नामों पर मुक्त।** Validator हर हुक स्लॉट के लिए एक हस्ताक्षर रखता है:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

मिलान **टोकन दर टोकन** होता है: पैरामीटर प्रकार नाम ठीक मेल खाने चाहिए, `->` और रिटर्न प्रकार ठीक मेल खाने चाहिए, और पैरामीटर संख्या तथा comma की स्थिति जाँची जाती है। पैरामीटर *नाम* स्वतंत्र हैं — पैरामीटर स्थिति में कोई भी पहचानकर्ता स्वीकार्य है, इसीलिए आपका `fn bloxdTerrainLight(s, l)` संकलित होता है, चाहे टेम्पलेट इसे `(surface, light)` लिखता हो। light हुक ठीक दो पैरामीटर लेता है।

**आरक्षित नाम।** नियम एक ही regex है: `/^bloxd/i`. `bloxd` से शुरू होने वाला कोई भी पहचानकर्ता आरक्षित है — हर `bloxd*` इंजन-प्रदत्त है, और पैक उस namespace में घोषणा नहीं कर सकता (यही कारण है कि §44 की `bloxdPi` / `bloxdTau` पुनःघोषणाएँ टकराती हैं)।

**विशेष फ़ंक्शन।** v3 में ठीक एक पंजीकृत है:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

"विशेष" का अर्थ है *किसी मैक्रो से बंधा* — ऐसा इंजन फ़ंक्शन जिसकी उपलब्धता वेरिएंट प्रतीक पर निर्भर है। सही उपयोग के लिए दो guard डायग्नोस्टिक्स हैं:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — surface/light-केवल फ़ंक्शन तक पहुँचता vertex हुक।
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — उदाहरण के लिए `#ifdef BLOXD_SCENE_DEPTH` में लिपेटे बिना terrain-side `bloxdOpaqueBehind()`।

**इंजन हेडर (प्रील्यूड), स्थिर।** v3 हेडर 5,637 बाइट का स्ट्रिंग है जो `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` से शुरू होता है। इसमें `#if` / `#ifdef` directives हैं जिन्हें इंजन का अपना WGSL प्रीप्रोसेसर प्रति वेरिएंट मूल्यांकित करता है — इंजन वास्तव में `#if` अभिव्यक्ति मूल्यांकन चलाता है, और खराब अभिव्यक्ति `Cannot evaluate #if ...` के साथ त्रुटि देती है। इस गाइड की हर संरचना, फ़ंक्शन हस्ताक्षर और उद्धृत टिप्पणी इसी रेंडर किए गए टेक्स्ट से आती है, इसलिए गाइड और भेजा गया हेडर एक-दूसरे से अलग नहीं हो सकते। पूरा पाठ §54 के अंत में शब्दशः दिया गया है।

**लेखकों के लिए पार्सर नोट्स।**

- इंजन shader में मिलाते समय पैक-पक्ष फ़ंक्शनों का नाम `pack_` उपसर्ग के साथ बदला जाता है (टकराव से बचाव); डायग्नोस्टिक्स उन्हें आपके मूल नामों पर वापस मैप करते हैं — वही तंत्र जिसे [भाग VIII](08-apiv2.md) §38 दूसरे सत्यापन चरण के लिए वर्णित करता है।
- undeclared-identifier संदेश है `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` और `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` नए पुष्ट सेट को पूरा करते हैं।
- पार्सर के लेक्सिकल यूनिवर्स में ऐसे पहचानकर्ता हैं जो **मानक WGSL नहीं हैं**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`। इंजन इन्हें built-ins के रूप में जानता है, पर किसी दिए गए ब्राउज़र का WGSL कार्यान्वयन उन्हें प्रदान करता है या नहीं, इसकी गारंटी नहीं — वितरण पैक कभी इन पर न बनाएँ।

## 54. पुष्ट स्थिरांक, सीमाएँ और लेआउट

terrain प्रोग्राम का पूरा संसाधन लेआउट, सीधे प्रोडक्शन Lite रेंडरर से:

| Binding | सामग्री |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = render frame में translation, w = fade-in visibility |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — पैक uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — depth texture (§51) |

- **दिशात्मक प्रकाश अधिकतम चार तक सीमित हैं।** अगर कोई scene अधिक पंजीकृत करने की कोशिश करता है तो रेंडरर `Terrain supports 4 directional lights, not ${n}` के साथ त्रुटि देता है। `l.directional` जितने भी मौजूद हों (0–4; Bloxd के अपने scene 2 उपयोग करते हैं — [भाग VII](07-internals.md) §27) उन सब पर योग किया गया Lambert है। Terrain उन प्रकाशों के बारे में भी चेतावनी देता है जिन्हें वह मान नहीं सकता, शब्दशः: देर से जोड़ा गया प्रकाश — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; रंगा हुआ प्रकाश — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; और mesh-फ़िल्टर करने वाला — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Terrain प्रोग्राम नामकरण**: पाइपलाइन कैश कुंजियाँ `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` पढ़ती हैं — पैक `-sp{variant}` प्रत्यय के रूप में दिखता है, §46 के प्रति वेरिएंट एक प्रोग्राम। एक watcher (`watchPipelineFailures`) live pipeline नामों को `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` से मिलाता है और pipeline compilation विफल होने पर मेल खाते पैक वेरिएंट को पुनः जाँचता है; GPU device loss (`device.lost`) जाँच छोड़ देता है।
- **`BLOXD_TERRAIN_DIRECTIONAL` एक इंजन-आंतरिक मैक्रो है** (dirLightCount > 0 होने पर परिभाषित)। यह प्रील्यूड के चार में से *नहीं* है और कभी पैक कोड तक नहीं पहुँचता — पर यह इंजन के अपने shaders के WGSL dumps में दिखता है, इसलिए इसे पहचानना भ्रम बचाता है।
- **Light-level decode**: `aPackedLightLevels` vertex attribute एक f32 है जो चार निबल पैक करता है, प्रत्येक 15 से विभाजित: rgb = रंगीन ब्लॉक प्रकाश, a = sky/held चैनल। Vertex चरण इसे `vLightLevels` varying में decode करता है; `blockLight` `.rgb` पढ़ता है, sky/held चैनल `.w` पढ़ता है। इंजन इंटरपोलेशन से पहले rgb चैनलों को सबसे चमकीले चैनल के 35% पर floor करता है — [भाग VII](07-internals.md) §26 जिस lift को गेमप्ले से प्रलेखित करता है उसका इंजन-पक्ष anchor यही है।
- **`vTerrainLambert`** (`directional` का स्रोत, §49) सक्रिय दिशात्मक प्रकाशों पर योग के रूप में बनता है: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, जो `BLOXD_TERRAIN_DIRECTIONAL` से guard है।
- **सबसे बड़े पहले mesh पर index buffers 32-बिट हो जाते हैं।** Lite रेंडरर `Uint16Array` indices तभी चुनता है जब तक हर index मान ≤ 65,534 रहे — जैसे ही कोई index 65,535 तक पहुँचता है, buffer `Uint32Array` बन जाता है (प्रति buffer `is32Bits` flag से ट्रैक)। व्यवहार में: अधिकतम 65,535 vertices वाला chunk mesh 16-बिट indices में फ़िट होता है; ठीक 65,536 vertices वाला अनिवार्य रूप से 65,535 index निकालता है और पूरा buffer 32-बिट पर स्विच कर देता है।
- **मैनिफ़ेस्ट लोडिंग विवरण**: `__MACOSX/` के नीचे zip entries, `._` उपसर्ग वाली फ़ाइलें, और `.DS_Store` फ़िल्टर हो जाते हैं (macOS संग्रह शोर); `pack.json` path की lowercased तुलना से पाया जाता है — शून्य मैच → `loadNoManifest`, दो या अधिक → `loadDuplicateManifest`; मैनिफ़ेस्ट पठन 65,536 बाइट तक सीमित है।
- **यह सब कैसे सत्यापित हुआ**: प्रोडक्शन बंडल के modules बहाल किए गए (165 चंक; इस बंडल में webpack registry 4,951 modules गिनता है — async child dependencies शामिल हैं या नहीं, इसके अनुसार module गिनती कुछ इकाइयों से बदलती है, इसलिए सटीक संख्या को bundle-specific मानें) और Node.js के नीचे webpack-संगत हार्नेस में चलाए गए। मापा गया `HEADER_VERSION` (§53), रेंडर किया गया 5,637-बाइट हेडर, वेरिएंट तालिका का canonical क्रम, और विशेष-फ़ंक्शन मैप सब *भेजे गए कोड को चलाने* से आते हैं, strings पढ़ने से नहीं। वही हार्नेस सामुदायिक `pack_check` v6 का स्वाभाविक कोर है — पैक के विरुद्ध इंजन के अपने validator को चलाने से उसके निर्णय ठीक वैसे ही पुनरुत्पन्न होते हैं।
### v3 इंजन हेडर, शब्दशः

स्थिर 5,637-बाइट (127-पंक्ति) पाठ स्वयं — वही अनुशंसित टुकड़ा जिसका वर्णन ऊपर §53 करता है — बिल्ड `3ymzdd` (इस भाग का v3 प्रोडक्शन बिल्ड) से शब्दशः पुनर्स्थापित। यह [भाग XI](11-reference.md) §67 के v4 हेडर का v3 समकक्ष है और उसी कारण पूरा अंतर्निहित है: v3 पैक को इंजन द्वारा अग्रयोजित ठीक उसी पाठ के विरुद्ध डिबग किया जा सके, और हर v3 → v4 अंतर ([भाग X](10-apiv4.md) §58–§59) दोनों पाठों को साथ रखकर सीधे पढ़ा जा सके।

```wgsl

// Engine-provided and read-only, prepended to all packs. apiVersion 3.

// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Per frame: the same for every vertex and fragment of a frame. The functions read bloxdPackInputs, the engine's
// uniforms, which packs can't name. Any function can call them, not only a hook.

// Seconds since the page loaded. In f32, so it counts in steps of under 1 ms for the first 4.5 hours, and of about
// 4 ms from 9 to 18 hours. bloxdSeconds() % period counts from 0 up to period, then starts again.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whole blocks: a render position plus this is a world position. It changes as the player travels, so render positions
// stay close to the player, and so precise.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Unit, towards the sun, in world orientation; zero when the sky has no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// A render position's world position. In f32, so it loses fine detail far from the world's origin.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// The world block the face at a fragment's position and normal belongs to, exact anywhere: half a block back inside it.
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

// Bits of the hook inputs' blockFlags: what a face's block is and what it's made of. A block made of several materials
// has each, as sandstone is sand and rock, so leaves are vegetation and not dirt. Test one with
// (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;     // Fully opaque, leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks.
const bloxdBlockFlagEmissive: u32 = 2;   // Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint.
const bloxdBlockFlagVegetation: u32 = 4; // Leaves, and the grass on grass blocks, which are dirt too. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagDirt: u32 = 8;       // Dirt and soil, grass blocks included. Rocky Dirt is rock too.
const bloxdBlockFlagSand: u32 = 16;      // Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagRock: u32 = 32;      // Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma.

struct BloxdVertexIn {
    position: vec3f,     // A render position: world minus bloxdRenderOffset().
    normal: vec3f,
    blockFlags: u32,     // What kind of block this face is: bloxdBlockFlag* bits, the same across the face.
}

struct BloxdVertex {
    position: vec3f,     // A render position.
}

struct BloxdSurfaceIn {
    colour: vec3f,       // Texture * vertex colour (tint * AO).
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // A render position; see bloxdWorldPosition and bloxdFaceBlock.
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // Added after lighting, then fogged.
}

struct BloxdLightIn {
    litColour: vec3f,    // The engine's lit result for this fragment, from the surface hook's colour: before emission and fog.
    directional: f32,    // Summed Lambert from the scene's directional lights (0 when off).
    ambient: vec3f,      // Ambient light, added to directional.
    blockLight: vec3f,   // Voxel block light, tone-mapped; 0 without BLOXD_LIGHTING.
    skyLight: f32,       // Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // White without BLOXD_LIGHTING.
    skyLightColour: vec3f,     // White without BLOXD_LIGHTING.
    heldLight: vec3f,    // Held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
                         // or without BLOXD_LIGHTING.
    fogColour: vec3f,    // The game's fog colour. Bloxd's games always have fog, pushed far out when the player
                         // turns it off; black only in a scene with no fog at all.
    fogVisibility: f32,  // 1 = no fog, 0 = fully fogged.
    position: vec3f,     // As in BloxdSurfaceIn.
    normal: vec3f,
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdLight {
    colour: vec3f,
}

// Returned by bloxdOpaqueBehind(), which surface and light hooks may call where BLOXD_SCENE_DEPTH is defined.
struct BloxdOpaqueBehind {
    found: bool,         // False where nothing opaque is behind (sky).
    position: vec3f,     // A render position; meaningless when !found.
    distance: f32,       // From the eye; meaningless when !found.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Fogs colour as the engine fogs this fragment.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

---

# भाग X: API Version 4 माइग्रेशन गाइड (2026-10-26, सारांश)

> यह इस भाषा में संक्षिप्त सारांश है। सभी विवरणों, उदाहरण रेसिपी और पुनर्स्थापित इंजन-आंतरिक तथ्यों (§55–§66) सहित पूर्ण संस्करण [अंग्रेज़ी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) और [जापानी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) में है।

लक्ष्य बिल्ड: `cnty9.main.669f8081.js` — **2026-10-26 से उत्पादन और preprod दोनों में एक साथ लाइव** (दोनों बाइट-समान)। पैक मॉडल अपना स्वरूप बनाए रखता है: वही `pack.json` फ़ील्ड, वही लोडर सीमाएँ, वही 64 B uniform, वही 6 हुक।

## क्या बदलता है

- `pack.json` में `"apiVersion": 4` चाहिए (सख़्त `===`, संख्या) — v3 पैक लोड पर अस्वीकृत।
- **नया टेक्सचर API (मुख्य आकर्षण):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` ब्लॉक-टेक्सचर एटलस को ठीक वैसे ही सैंपल करता है जैसे इंजन स्वयं करता है (id 0 = सफ़ेद; एनिमेटेड टेक्सचर स्वतः वर्तमान फ़्रेम देते हैं), `bloxdTextureSize(mipLevel) -> vec2u`, और नामित स्थिरांक `bloxdTextureId*` (फ़ाइल-नाम से CamelCase, जैसे `grass_top` → `bloxdTextureIdGrassTop`; सभी 905 प्रयोज्य नामों का पूर्ण कैटलॉग भाग XI (`11-reference.md`) के §68 में अंतर्निहित है)।
- `BloxdSurfaceIn` *और* `BloxdLightIn` में **चार नए इनपुट फ़ील्ड**: `textureId`, `textureRotation` (दक्षिणावर्त चौथाई घुमाव, जिसे `bloxdTexel` लागू करता है), `uv` (ब्लॉक में; `fract(uv)` अंकित होता है), `mipLevel`।
- **अर्थ-बदलाव के साथ पुनर्नामकरण:** `fogVisibility` → `fogAlpha` **उलटे** अर्थ के साथ (`0 = कोई फ़ॉग नहीं, 1 = केवल fogColour`; पोर्ट: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (काय समान); `BloxdOpaqueBehind.found` → `hit`।
- **strict गेम अब बंडल के वैलिडेटर से लागू होते हैं:** असुरक्षित वर्टेक्स हुक या पहुँच-योग्य `discard` पर `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` संदेश आता है और strict गेमों में **सभी** हुक निष्क्रिय हो जाते हैं। `#ifndef BLOXD_STRICT` रैपर से surface/light चलते रहते हैं।
- बाकी सब जमा हुआ: 6 हुक, `blockFlags` बिट (1/2/4/8/16/32), uniform लेआउट, लोडर सीमाएँ, वेरिएंट मैट्रिक्स, 12 allow शीर्षक (`cnty9` पर 2026-10-27 को अपरिवर्तित पुष्ट)।

## संक्षिप्त माइग्रेशन

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (संख्या) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` या `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| असुरक्षित वर्टेक्स हुक | `#ifndef BLOXD_STRICT ... #endif` |

संपूर्ण संदर्भ सामग्री भाग XI (`11-reference.md`) के रूप में अंतर्निहित है — शब्दशः पुनर्स्थापित इंजन हेडर और सभी 905 प्रयोज्य टेक्सचर नामों का पूर्ण मापा कैटलॉग; फिर भी रेसिपी लोडिंग स्क्रीन व इन-गेम कंपाइल से सत्यापित करते रहें। पूर्ण विवरण — `bloxdTexel` की रोटेशन-बारीकी, पुनर्स्थापित सैंपलिंग WGSL, ≈900 प्रयोज्य स्थिरांकों वाला नाम-रजिस्ट्री, रजिस्ट्री-हैश सहित नया `HEADER_VERSION` — अंग्रेज़ी और जापानी पूर्ण संस्करण में हैं।

[← पिछला भाग](09-apiv3.md)·[मैनुअल पर वापस जाएं](README.md)

---

# भाग XI: संपूर्ण संदर्भ — इंजन हेडर और टेक्सचर कैटलॉग

लक्ष्य बिल्ड: `cnty9.main.669f8081.js` (मापा गया 2026-10-27; प्रोडक्शन और प्रीप्रोड बाइट-समान)। यह भाग दोनों संदर्भ सामग्री को **संपूर्ण रूप से** अंतर्निहित करता है ताकि गाइड स्वयं-निर्भर रहे। §67 वह सटीक हेडर पाठ है जो इंजन हर पैक के आगे जोड़ता है (प्रोडक्शन बंडल से शब्दशः पुनर्स्थापित); §68 टेक्सचर-नाम कैटलॉग का पूर्ण संस्करण है: मापी गई id के साथ सभी 905 प्रयोग-योग्य `bloxdTextureId*` नाम, 57 घुमाई गई परिवार, 42 एनिमेटेड परिवार, और रजिस्ट्री-ड्रिफ्ट का माप।

यह कैटलॉग अनुमान नहीं है: इंजन का **अपना** रजिस्ट्री-बिल्डर मॉड्यूल (module 28833 — वही कोड जो सत्यापन-समय पर `bloxdTextureId*` को हल करता है) को लाइव बिल्ड के डेटा (`textureNameToIndex`, `animDataPerTex`) पर चलाकर उसका आउटपुट अंकित किया गया। नाम ही API हैं; id एक बिल्ड का स्नैपशॉट हैं और बदलती रहती हैं (§68.5)।

दोनों खंडों की विस्तृत व्याख्या भाग XI के अंग्रेज़ी और जापानी पूर्ण संस्करणों में है; यहाँ डेटा पूरा है।


## 67. संपूर्ण v4 इंजन हेडर, शब्दशः

वह 6,021-बाइट (150-पंक्ति) हेडर जो इंजन हर पैक के आगे जोड़ता है — पहली पंक्ति `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` इसमें सम्मिलित नहीं: प्रति रेंडरर-कॉन्फ़िगरेशन जनरेट होने वाली `bloxdTexel`/`bloxdTextureSize` जोड़ी (§63.1) और 27 `bloxdSp*` प्रतीक (§63.4)। `#ifdef BLOXD_ALPHA` गेट इंजन का प्रीप्रोसेसर प्रति वेरिएंट हल करता है।


```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. संपूर्ण टेक्सचर कैटलॉग (905 नाम, मापा गया)

### 68.1 इसे कैसे पढ़ें

**नाम** रजिस्ट्री हैंडल है; स्थिरांक CamelCase से बनता है (§57.3): `grass_top` → `bloxdTextureIdGrassTop`। **id** स्थिरांक का मान है (एटलस परत + 1, `cnty9` पर मापी गई) — डिबगिंग के लिए, हार्डकोड करने के लिए नहीं। **टिप्पणी** कॉलम एनिमेटेड परिवार (स्वतः वर्तमान फ़्रेम) और घुमाए गए परिवार (मूल को संबोधित करें; `bloxdTexel` घुमाव पुनः लागू करता है) चिह्नित करता है।

जो यहाँ नहीं है: 416 ज्ञात उपनाम-वर्तनियाँ (188 फ़्रेम, 228 रोटेशन) — ये स्थिरांक नहीं हैं और इन्हें समर्पित त्रुटि संदेश मिलते हैं (§57.3)।


### 68.2 कैटलॉग

सभी प्रयोग-योग्य नाम, वर्णक्रम में। id एक `cnty9` स्नैपशॉट हैं — नाम रजिस्ट्री-ड्रिफ्ट से बच जाते हैं क्योंकि सत्यापक उन्हें लोड-समय पर पुनः हल करता है।

| नाम | id (cnty9) | टिप्पणी |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 घुमाए गए परिवार (57 मूल)

ये टेक्सचर केवल पूर्व-घुमाई प्रतियों (`name[rot[1..4`) के रूप में मौजूद हैं; रजिस्ट्री उन्हें मूल पर फोल्ड करती है और `bloxdTexel` घुमाव पुनः लागू करता है (§57.4)।

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19) · also animated
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 एनिमेटेड परिवार (42 नाम)

इन नामों को सैंपल करने पर वर्तमान एनिमेशन फ़्रेम स्वतः मिलता है (§63.3) — फ़्रेम-प्रत्यय त्रुटि हैं।

अंतराल प्रति परिवार निश्चित है और `cnty9` पर मापा गया — केवल तीन मान: **200 ms** (`lava`, `toxic_waste`, `radar_screen`), **250 ms** (`smoke`, `homestead_core_mid`, सभी मशीन `*_running` परिवार), **300 ms** (सत्रह पोर्टल और `toxic_waste_barrel_top`); «अंतराल» कॉलम देखें। वैसे एटलस में 42 नहीं बल्कि 45 एनिमेटेड रूट हैं: `radar_screen` की चार पूर्व-घूमी प्रतियाँ प्रत्येक अपनी 4-फ़्रेम सीढ़ी चलाती हैं।

| नाम | फ़्रेम | अंतराल | रजिस्ट्री आधार |
|---|---|---|---|
| `lava` | 8 | 200 ms | `lava0` |
| `toxic_waste` | 8 | 200 ms | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | 250 ms | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | 250 ms | `auto_bench_side_running0` |
| `black_portal` | 4 | 300 ms | `black_portal0` |
| `blue_portal` | 4 | 300 ms | `blue_portal0` |
| `brown_portal` | 4 | 300 ms | `brown_portal0` |
| `burner_drill_side_running` | 4 | 250 ms | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | 250 ms | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | 250 ms | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | 250 ms | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | 250 ms | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | 300 ms | `cyan_portal0` |
| `deep_drill_side_running` | 4 | 250 ms | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | 250 ms | `electric_drill_side_running0` |
| `generator_side_running` | 4 | 250 ms | `generator_side_running0` |
| `gray_portal` | 4 | 300 ms | `gray_portal0` |
| `green_portal` | 4 | 300 ms | `green_portal0` |
| `grey_portal` | 4 | 300 ms | `grey_portal0` |
| `homestead_core_mid` | 4 | 250 ms | `homestead_core_mid0` |
| `lightblue_portal` | 4 | 300 ms | `lightblue_portal0` |
| `lightgray_portal` | 4 | 300 ms | `lightgray_portal0` |
| `lime_portal` | 4 | 300 ms | `lime_portal0` |
| `magenta_portal` | 4 | 300 ms | `magenta_portal0` |
| `orange_portal` | 4 | 300 ms | `orange_portal0` |
| `pink_portal` | 4 | 300 ms | `pink_portal0` |
| `press_side_running` | 4 | 250 ms | `press_side_running0` |
| `purple_portal` | 4 | 300 ms | `purple_portal0` |
| `radar_screen` | 4 | 200 ms | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | 250 ms | `recycler_side_running0` |
| `red_portal` | 4 | 300 ms | `red_portal0` |
| `shatter_mill_side_running` | 4 | 250 ms | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | 250 ms | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | 250 ms | `smelter_side_running0` |
| `smoke` | 4 | 250 ms | `smoke0` |
| `toxic_waste_barrel_top` | 4 | 300 ms | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | 250 ms | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | 250 ms | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | 250 ms | `volt_engine_side_running0` |
| `white_portal` | 4 | 300 ms | `white_portal0` |
| `wire_mill_side_running` | 4 | 250 ms | `wire_mill_side_running0` |
| `yellow_portal` | 4 | 300 ms | `yellow_portal0` |

### 68.5 रजिस्ट्री-ड्रिफ्ट, मापा गया (sjr0p7 → cnty9)

अक्टूबर में मापे गए दो बिल्ड, दस दिन के अंतराल पर:

- Entries: 1,200 → 1,219 (98 added, 79 removed)
- Names that kept their spelling: 1,121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names became `[rot[1..4` slots, and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

Write `bloxdTextureIdLava`, not `19` — a name-constant survives every one of those bullets unchanged.

### 68.6 ड्रिफ्ट सूचियाँ, संपूर्ण (98 जोड़े गए, 79 हटाए गए)

§68.5 के आँकड़े, नाम-दर-नाम लिखे गए — क्योंकि अक्टूबर का टेक्सचर पैक अपडेट करने वाले को ठीक यह जानना ज़रूरी है कि कौन से फ़ाइल-नाम अब मेल नहीं खाते। तुलना *वर्तनी* स्तर की है (टेक्सचर पैक जो फ़ाइल-नाम उपयोग करते हैं); §64 की फोल्डिंग नियम उन वर्तनियों को §68.2 के प्रयोज्य स्थिरांकों में बदलते हैं।

**घुमाव-वाले परिवारों में स्थानांतरण — 17 मशीन टॉप (68 वर्तनियाँ बाहर, 68 स्लॉट अंदर)।** `alloy_kiln_top`, `auto_bench_top`, `belt_tunnel_exit_top`, `belt_tunnel_top`, `burner_drill_top`, `crop_harvester_top`, `crusher_top`, `crystal_vat_top`, `deep_drill_top`, `electric_drill_top`, `press_top`, `recycler_top`, `shatter_mill_top`, `sky_tap_top`, `smelter_top`, `tree_cutter_top`, `wire_mill_top` `_rot1..4` वर्तनी से `[rot[1..4` पूर्व-घूमे स्लॉट में चले गए; फोल्ड की गई रूट ही प्रयोज्य नाम है, इसलिए टेक्सचर पैक अब चार `X_top_rotN.png` फ़ाइलों की जगह एक `X_top.png` भेजता है।

**संदूक टॉप फोल्ड — 3 परिवार (6 वर्तनियाँ बाहर, 12 स्लॉट अंदर)।** `chest_top_1`/`chest_top_2` → `chest_top`, `iron_chest_top_1`/`_2` → `iron_chest_top`, `moonstone_chest_top_1`/`_2` → `moonstone_chest_top`: दो-वेरिएंट वर्तनियाँ रूट के अंतर्गत पूर्व-घूमे स्लॉट बन गईं — PNG फ़ाइलों का नाम उसी तरह बदलें।

**नई टेक्सचर — 17 नाम।** डबल संदूक (`chest_double_back_hi`/`_lo`, `chest_double_front_hi`/`_lo`, `chest_double_top_1_hi`/`_lo`, `chest_double_top_2_hi`/`_lo`), डार्कस्टोन परिवार (`darkstone`, `darkstone_bricks`, `darkstone_bricks_cracked`, `darkstone_bricks_lava`, `darkstone_engraved`, `darkstone_smooth`), `pure_copper_ore`, `pure_voltite_ore` और `forge_hopper_top`।

**एक सादा फोल्ड।** `ghost_chest_top_1`/`ghost_chest_top_2` एक अकेले `ghost_chest_top` में सिमट गए।

**पूरी तरह हटाए गए — 3 नाम।** `shaft_hopper_top`, `sun_panel_side`, `sun_panel_top` का नए रजिस्ट्री में कोई उत्तराधिकारी वर्तनी नहीं है — यह कंटेंट इस बिल्ड के साथ खेल से चला गया। `forge_hopper_top` वास्तव में नई टेक्सचर है, सत्यापित पुनर्नामकरण नहीं।

सत्यापन के लिए कच्चा वर्तनी-डिफ:

```text
+ 98 added (cnty9):
alloy_kiln_top[rot[1, alloy_kiln_top[rot[2, alloy_kiln_top[rot[3, alloy_kiln_top[rot[4, auto_bench_top[rot[1, auto_bench_top[rot[2
auto_bench_top[rot[3, auto_bench_top[rot[4, belt_tunnel_exit_top[rot[1, belt_tunnel_exit_top[rot[2, belt_tunnel_exit_top[rot[3, belt_tunnel_exit_top[rot[4
belt_tunnel_top[rot[1, belt_tunnel_top[rot[2, belt_tunnel_top[rot[3, belt_tunnel_top[rot[4, burner_drill_top[rot[1, burner_drill_top[rot[2
burner_drill_top[rot[3, burner_drill_top[rot[4, chest_double_back_hi, chest_double_back_lo, chest_double_front_hi, chest_double_front_lo
chest_double_top_1_hi, chest_double_top_1_lo, chest_double_top_2_hi, chest_double_top_2_lo, chest_top[rot[1, chest_top[rot[2
chest_top[rot[3, chest_top[rot[4, crop_harvester_top[rot[1, crop_harvester_top[rot[2, crop_harvester_top[rot[3, crop_harvester_top[rot[4
crusher_top[rot[1, crusher_top[rot[2, crusher_top[rot[3, crusher_top[rot[4, crystal_vat_top[rot[1, crystal_vat_top[rot[2
crystal_vat_top[rot[3, crystal_vat_top[rot[4, darkstone, darkstone_bricks, darkstone_bricks_cracked, darkstone_bricks_lava
darkstone_engraved, darkstone_smooth, deep_drill_top[rot[1, deep_drill_top[rot[2, deep_drill_top[rot[3, deep_drill_top[rot[4
electric_drill_top[rot[1, electric_drill_top[rot[2, electric_drill_top[rot[3, electric_drill_top[rot[4, forge_hopper_top, ghost_chest_top
iron_chest_top[rot[1, iron_chest_top[rot[2, iron_chest_top[rot[3, iron_chest_top[rot[4, moonstone_chest_top[rot[1, moonstone_chest_top[rot[2
moonstone_chest_top[rot[3, moonstone_chest_top[rot[4, press_top[rot[1, press_top[rot[2, press_top[rot[3, press_top[rot[4
pure_copper_ore, pure_voltite_ore, recycler_top[rot[1, recycler_top[rot[2, recycler_top[rot[3, recycler_top[rot[4
shatter_mill_top[rot[1, shatter_mill_top[rot[2, shatter_mill_top[rot[3, shatter_mill_top[rot[4, sky_tap_top[rot[1, sky_tap_top[rot[2
sky_tap_top[rot[3, sky_tap_top[rot[4, smelter_top[rot[1, smelter_top[rot[2, smelter_top[rot[3, smelter_top[rot[4
tree_cutter_top[rot[1, tree_cutter_top[rot[2, tree_cutter_top[rot[3, tree_cutter_top[rot[4, wire_mill_top[rot[1, wire_mill_top[rot[2
wire_mill_top[rot[3, wire_mill_top[rot[4

- 79 removed (sjr0p7):
alloy_kiln_top_rot1, alloy_kiln_top_rot2, alloy_kiln_top_rot3, alloy_kiln_top_rot4, auto_bench_top_rot1, auto_bench_top_rot2
auto_bench_top_rot3, auto_bench_top_rot4, belt_tunnel_exit_top_rot1, belt_tunnel_exit_top_rot2, belt_tunnel_exit_top_rot3, belt_tunnel_exit_top_rot4
belt_tunnel_top_rot1, belt_tunnel_top_rot2, belt_tunnel_top_rot3, belt_tunnel_top_rot4, burner_drill_top_rot1, burner_drill_top_rot2
burner_drill_top_rot3, burner_drill_top_rot4, chest_top_1, chest_top_2, crop_harvester_top_rot1, crop_harvester_top_rot2
crop_harvester_top_rot3, crop_harvester_top_rot4, crusher_top_rot1, crusher_top_rot2, crusher_top_rot3, crusher_top_rot4
crystal_vat_top_rot1, crystal_vat_top_rot2, crystal_vat_top_rot3, crystal_vat_top_rot4, deep_drill_top_rot1, deep_drill_top_rot2
deep_drill_top_rot3, deep_drill_top_rot4, electric_drill_top_rot1, electric_drill_top_rot2, electric_drill_top_rot3, electric_drill_top_rot4
ghost_chest_top_1, ghost_chest_top_2, iron_chest_top_1, iron_chest_top_2, moonstone_chest_top_1, moonstone_chest_top_2
press_top_rot1, press_top_rot2, press_top_rot3, press_top_rot4, recycler_top_rot1, recycler_top_rot2
recycler_top_rot3, recycler_top_rot4, shaft_hopper_top, shatter_mill_top_rot1, shatter_mill_top_rot2, shatter_mill_top_rot3
shatter_mill_top_rot4, sky_tap_top_rot1, sky_tap_top_rot2, sky_tap_top_rot3, sky_tap_top_rot4, smelter_top_rot1
smelter_top_rot2, smelter_top_rot3, smelter_top_rot4, sun_panel_side, sun_panel_top, tree_cutter_top_rot1
tree_cutter_top_rot2, tree_cutter_top_rot3, tree_cutter_top_rot4, wire_mill_top_rot1, wire_mill_top_rot2, wire_mill_top_rot3
wire_mill_top_rot4
```


[← Previous part](10-apiv4.md)·[Back to the manual](README.md)
