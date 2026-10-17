[← पिछला भाग](07-internals.md)·[मैनुअल पर वापस जाएं](README.md)

# भाग VIII: API Version 2 माइग्रेशन गाइड

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

तीनों संरचनाओं `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` में `blockId: u32` जुड़ा। **फलक स्वामी खंड ID** (0–65535), उसी फलक सर्वत्र समान (`@interpolate(flat)` से पारित)। टेक्सचर वर्ण अनाश्रित खंड प्रकार पहचान हेतु प्रयोग करें। पर ID-खंड-प्रकार संगति तालिका इंजन भीतर है, पैकों से अदृश्य, अतः **कौन ID कौन खंड केवल दुनिया में मापकर** जानें।

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

अनुप्रयोग: मोटाई आधारित अवशोषण/प्रकीर्णन, `behind.position` से तल विश्व निर्देशांक से तरंग-कास्टिक-ढंग पैटर्न प्रक्षेपण, `found=false` से आकाश व अवरोध भेद से जलपृष्ठ आकाश परावर्तन, गहराई से झाग व मैलापन चरणबद्ध। गहराई प्रतिलिपि पाइपलाइन निर्माण विफल हो तो "पीछे कुछ नहीं" सुरक्षित अवनति।

## 36. अन्य v2 परिवर्तन

- **हुक फॉलबैक**: `bloxdLiquidXxx` अपरिभाषित हो तो तरल प्रोग्राम टेरेन हुकों पर गिरते हैं। **केवल टेरेन हुक पैक जल पर भी ज्यों का त्यों असर करता है**। अनभीष्ट हो तो तरल पक्ष हुक स्पष्ट परिभाषित करें।
- **`BLOXD_LIGHTING` फ़ील्ड रक्षक अनावश्यक**: `blockLight` आदि सभी वेरिएंटों में हैं, अलिट में डिफ़ॉल्ट (0 / 1 / श्वेत / 0) रहते हैं। केवल प्रकाश परीक्षण हेतु `#ifdef BLOXD_LIGHTING` प्रयोग करें। विद्यमान रक्षक रखने से कुछ नहीं बदलता।
- **`BLOXD_ALPHA` परिभाषा शर्त बदली**: गैर-strict टेरेन वेरिएंटों व सभी तरल वेरिएंटों में परिभाषित, strict × टेरेन में अपरिभाषित। टेरेन हुकों में alpha लिखें तो रक्षक रखें।
- **संरचना सीधा निर्माण निषिद्ध**: `BloxdLight(...)` जैसे निर्माता आह्वान स्थैतिक सत्यापन में अस्वीकृत। सदा `bloxdDefault*` से बदलें या निवेश प्रतिलिपि प्रयोग करें।
- **`let _ =` से `_ =`**: WGSL त्याग समनुदेशन `_ = f();` वैध, पर `let _ = f();` अस्वीकृत।
- **offInStrict**: vertex हुक परिभाषा या surface / light हुकों से पहुच योग्य `discard` हो तो त्रुटि नहीं, पूरा पैक strict खेलों में स्वतः अक्षम (सेटिंग UI में `shaderPack:offInStrict`; allow खेलों में चलता है)। vertex हुक व `discard` `#ifndef BLOXD_STRICT` से लपेटें।
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
