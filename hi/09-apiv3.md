[← पिछला भाग](08-apiv2.md)·[मैनुअल पर वापस जाएं](README.md)

# भाग IX: API Version 3 माइग्रेशन गाइड

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

**इंजन हेडर (प्रील्यूड), स्थिर।** v3 हेडर 5,637 बाइट का स्ट्रिंग है जो `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` से शुरू होता है। इसमें `#if` / `#ifdef` directives हैं जिन्हें इंजन का अपना WGSL प्रीप्रोसेसर प्रति वेरिएंट मूल्यांकित करता है — इंजन वास्तव में `#if` अभिव्यक्ति मूल्यांकन चलाता है, और खराब अभिव्यक्ति `Cannot evaluate #if ...` के साथ त्रुटि देती है। इस गाइड की हर संरचना, फ़ंक्शन हस्ताक्षर और उद्धृत टिप्पणी इसी रेंडर किए गए टेक्स्ट से आती है, इसलिए गाइड और भेजा गया हेडर एक-दूसरे से अलग नहीं हो सकते।

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

---

शोध: ltf_ahel (glm के साथ शोध)

[← पिछला भाग](08-apiv2.md)·[मैनुअल पर वापस जाएं](README.md)
