# हुक इनवोकेशन इंटर्नल्स

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bny9u` · स्थिति: Analyzed (प्रोडक्शन बंडल से बहाल — Lite रेंडरर; एकीकृत स्रोत फ़ाइल `lite/terrainShaderPack.ts` त्रुटि-स्ट्रिंगों में बची रहती है)

इंजन रनटाइम पर हुक कैसे बुलाता है। इससे आपके लिखे कोड पर कुछ नहीं बदलता, पर हुक क्या पाते हैं इसका अंदाज़ा-लगाना मिट जाता है।

## स्प्लाइस आर्किटेक्चर

रेंडरर JavaScript से हुकों को "बुलाता" नहीं है। पैक सत्यापन पास करते ही इंजन **shader पाठ में तय एंकर पंक्तियों को बदलकर आपके हुक-आह्वान अपने terrain WGSL में लगा देता है**। हर एंकर ठीक एक बार मिलना चाहिए — शून्य या कई मिलान `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` के साथ निरस्त हो जाते हैं।

| चरण | इंजन shader में एंकर | क्या लगाया जाता है |
|---|---|---|
| vertex | `let worldPos = …` से `vertexOutputs.vNormalW = …` तक का ब्लॉक | `BloxdVertexIn` बनाना, vertex हुक बुलाना, `worldPos` वापस लिखना (`let worldPos` को `var worldPos` में बदलना भी) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` बनाना, surface हुक बुलाना, `baseColor` / `alpha` वापस लिखना |
| lit color | फ़ॉग-मिक्स से ठीक पहले | फ़ॉग-पूर्व रंग पकड़ता है (v3 `bloxdSpLitColour` टेम्परेरी उपयोग करता था — v5 इस भूमिका को सार्वजनिक `bloxdLitColour()` हेडर फ़ंक्शन में प्रमोट करता है) |
| light | फ़्रैगमेंट shader के अंत का `return color;` | `BloxdLightIn` बनाना, light हुक बुलाना, `color` वापस लिखना — फ़ॉग-मिक्स के बाद |

## स्प्लाइस क्या लागू करता है

- **strict terrain, surface-हुक के alpha बदलावों को नज़रअंदाज़ करता है।** `alpha = bloxdSpSurface.alpha` राइट-बैक केवल liquid प्रोग्राम या ग़ैर-strict वेरिएंट के लिए लगाया जाता है — मैक्रो तालिका के पीछे का कार्यान्वयन ([प्रीप्रोसेसर](../api/preprocessor.md))
- **vertex हुक घोषित करने वाला strict वेरिएंट उसे कभी नहीं चलाता।** इंजन बिल्ड-टाइम पर रिपोर्ट करता है: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`। इसीलिए टेम्पलेट में `#ifndef BLOXD_STRICT` है
- **`bloxdSp*` पहचानकर्ता** इंजन के टेम्परेरी हैं — आपके कोड को अदृश्य पर डायग्नोस्टिक्स और रिवर्स-इंजीनियरिंग आउटपुट में मौजूद ([आरक्षित पहचानकर्ता](reserved-identifiers.md) — v5 में 46)
- **डिफ़ॉल्ट-सरफ़ेस शॉर्टकट।** यदि किसी वेरिएंट का surface हुक शब्दशः `bloxdDefaultSurface` है, तो इंजन `baseColor` / `alpha` राइट-बैक ग्राफ़्ट पूरी तरह छोड़ देता है — डिफ़ॉल्ट पहले से ही वे मान पैदा करता है, इसलिए वे असाइनमेंट मृत कोड हैं। **बिना बदले हुक-श्रृंखलाओं की कोई कीमत नहीं है**

## v5 में क्या बदला

स्प्लाइस आर्किटेक्चर v2 रेंडरर में मौजूद था और v2 → v3 पर स्थिर रहा (v3 ने केवल `vBlockId` → `vBlockFlags` बदला और liquid वेरिएंट जोड़ा)। v5 के बदलाव:

- `vBlockFlags` (बिट) → **`BloxdFlags` स्ट्रक्चर** (`bloxdSpFlags` से वितरित)
- `litColour` कैप्चर इंजन-आंतरिक से **सार्वजनिक API** हो गया (`bloxdLitColour()` — v4 के `bloxdSpLitColour` का प्रमोशन)
- `BloxdLightIn` को `diffuse` / `emissive` मिले, और `bloxdShading()` सामग्री-प्रतिक्रिया दोबारा बनाता है ([लाइटिंग](../api/lighting.md))
- `localPosition` (`bloxdSpItemLocalPosition`), एनचैंट इनपुट (`bloxdSpEnchant`) और `overlayColour` की डिलीवरी ([मॉडल रेंडरिंग](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (उलटा)
- Model प्रोग्राम वेरिएंट मैट्रिक्स में शामिल हुआ (3 प्रोग्राम × 2 मोड = 6 वेरिएंट)

## BloxdLightIn को क्या खिलाता है (प्रति-फ़ील्ड)

| फ़ील्ड | इंजन-पक्ष स्रोत |
|---|---|
| `litColour` | फ़ॉग-मिक्स से ठीक पहले पकड़ा गया फ़्रैगमेंट रंग — हेडर के शब्दों में "emission और फ़ॉग से पहले" |
| `directional` | प्रति-दिशात्मक-प्रकाश लैम्बर्ट का vertex-इंटरपोलेटेड योग ([रेंडरिंग पाइपलाइन](rendering-pipeline.md) में 2-प्रकाश सेटअप) |
| `diffuse` / `emissive` | सामग्री की दिशात्मक RGB प्रतिक्रिया / RGB चमक |
| `ambient` | `material.ambient × sceneAmbient` — प्रति सामग्री, प्रति फ़्रेम |
| `blockLight` / `skyLight` | डिकोड किए गए लाइट-लेवल varying ([प्रकाश इंटर्नल्स](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | संगत uniform |
| `heldLight` | लाइट-लेवल varying और held-light uniform से बनता है (शंकु-फ़ॉलऑफ़ [प्रकाश इंटर्नल्स](lighting-internals.md) में) |
| `fogColour` | केवल पूरी तरह फ़ॉग-रहित scene (मोड 0) में काला |
| `fogAlpha` | clamp किया गया फ़ॉग गुणक ([फ़ॉग इंटर्नल्स](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varying और flat-इंटरपोलेटेड मान (`BloxdSurfaceIn` जैसे ही — vertex-हुक-बाद के मान) |

## संबंधित

- [शेडर हुक](../api/hooks.md) · [रेंडरिंग पाइपलाइन](rendering-pipeline.md) · [आरक्षित पहचानकर्ता](reserved-identifiers.md) · [संस्करण इतिहास: v3](../history/v3.md)
