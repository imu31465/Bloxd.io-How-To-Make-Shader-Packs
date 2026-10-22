[← पिछला भाग](01-making.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](03-recipes.md)

# भाग II: API संदर्भ

> वर्तमान खेल 2026-10-19 से `apiVersion: 3` चाहता है और लोड पर v1/v2 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) देखें।

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
