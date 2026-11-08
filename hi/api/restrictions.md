# प्रतिबंध और आरक्षित नाम

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` · स्थिति: Verified (v4 की सीमाएँ v5 पर बाइट-समान रूप से पुनः पुष्ट की गईं)

पैक क्या लिख सकते हैं, और नाम-आरक्षण के पूरे नियम।

## अनुमति

- WGSL बिल्ट-इन (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- आपके अपने `fn` / `struct` / `const` / `alias` / `var<private>`, फ़ंक्शन-भीतर के `let` और कंट्रोल फ़्लो (if/for/while/switch…)
- डिरिवेटिव (`dpdx` / `dpdy` / `fwidth`) केवल सरफ़ेस/लाइट हुकों में (fragment स्टेज) — वर्टेक्स हुकों में नहीं
- `const` ऐरे (रंग LUT आदि), पॉइंटर (`ptr<function, T>`), मैट्रिक्स (`mat3x3f` आदि)
- फ़्लैग परिभाषाएँ `#define NAME` (बिना मान) + `#ifdef` कंडीशनल

## मना / सावधानियाँ

- **सीधे टेक्सचर नहीं**: आप `texture_*` / `sampler` टाइप घोषित नहीं कर सकते; एटलस रीड केवल [`bloxdTexel`](texture-api.md) से होती है। *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` strict में मना है** — `#ifndef BLOXD_STRICT` में रैप करें
- `@attributes` / `enable` / `requires` / `override` मना हैं — `enable f16;` नहीं हो सकता, इसलिए **f16 टाइप नहीं**
- कोई `@builtin` नहीं है, इसलिए `fragCoord` / `vertex_index` अप्राप्य हैं
- **मॉड्यूल-स्कोप `let` नहीं** — `const` या `var` उपयोग करें
- कोई `atomic` नहीं
- **आउटपुट स्ट्रक्ट कभी सीधे न बनाएँ**: `BloxdLight(...)` स्टैटिक सत्यापन में विफल होता है; `bloxdDefault*` से शुरू करें
- ख़ाली छोड़ी हुई `var x: BloxdSurface;` घोषणा सत्यापन त्रुटि है
- हुक पैरामीटर केवल पढ़ने योग्य हैं — बदलने से पहले कॉपी करें
- `#define` कोई मान नहीं लेता (केवल नाम)

## आरक्षित नाम

### bloxd प्रीफ़िक्स (सामान्य नियम)

**`/^bloxd/i` (केस-असंवेदनशील) से मेल खाने वाला हर आइडेंटिफ़ायर आरक्षित है।** एकमात्र अपवाद 9 हुक फ़ंक्शन नाम हैं।

वैलिडेटर का शब्दशः अभिव्यक्ति:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### bloxdSp* नेमस्पेस (46 प्रतीक)

वे 46 प्रतीक जिन्हें कोड जेनरेटर इंजेक्ट कर सकता है और इसलिए जिन्हें पुनः घोषित नहीं किया जा सकता:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

ये फ़्लैग-स्ट्रक्ट डिलिवरी (`bloxdSpFlags`), एनचैंट और मॉडल-लोकल इनपुट (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), सेल-सैंपलिंग टेक्सचर-पैक पथ, रोटेशन चेन और एक्सटेंडेड-हुक लोकल्स को कवर करते हैं। **पैक-स्तर का आरक्षण नियम इस सूची से व्यापक है** (`/^bloxd/i` से मेल खाता सब कुछ), इसलिए इसे रटने की ज़रूरत नहीं — बस अपने नाम कभी भी `bloxd` से शुरू न करें।

### टेक्सचर नाम

`bloxdTextureId` से शुरू होने वाले आइडेंटिफ़ायर टेक्सचर-नाम स्थिरांक के रूप में रिज़ॉल्व किए जाते हैं ([टेक्सचर API](texture-api.md#bloxdtextureid-नामित-टेक्सचर-स्थिरांक))।

## स्वचालित रीराइट

- **Y-डिरिवेटिव के चिह्न का उलटाव**: एनालाइज़र `dpdy`, `dpdyCoarse` और `dpdyFine` की हर कॉल को `(-dpdy(...))` के रूप में रीराइट कर देता है (वैलिडेटर के टोकन-रीराइट पास में dpdy परिवार को उलटाव-सेट के रूप में स्पष्ट रूप से गिना गया है)। स्क्रीन-स्पेस y नीचे की ओर इशारा करता है, इसलिए यह उलटाव "ऊपर की ओर परिवर्तन की दर" को सहज बोध से मेल देता है। `dpdy(h)` को इस आशय से लिखें कि "ऊपर जाने पर h कैसे बदलता है", और उत्सर्जित कोड वह उलटाव ले लेता है। `dpdx` और `fwidth` परिवार अछूते रहते हैं

## डायग्नोस्टिक जो आप वास्तव में देखेंगे

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## संबंधित

- [ट्रबलशूटिंग: कंपाइलेशन](../troubleshooting/compilation.md) · [इंजन इंटरनल्स: शेडर सत्यापन](../internals/shader-validation.md)
