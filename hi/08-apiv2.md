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
