[← पिछला भाग](making.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](recipes.md)

# भाग II: API संदर्भ

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
- `bloxdSunDirection()` सूर्य रहते समय इकाई वेक्टर है; सूर्यहीन आकाश में शून्य। **चंद्रमा सदा `-bloxdSunDirection()` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। पर डिफ़ॉल्ट दुनियाओं में सूर्य स्थिर, चंद्रमा भी स्थिर — गतिशील चंद्रमा केवल दिन-रात चक्र दुनियाओं में मायने रखता है ([भाग VII](internals.md), अनुभाग 24 देखें)
- ※टिप्पणी: पहले "शून्य पर चंद्र दिशा पुनःप्रयोग असंभव" लिखा था। दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध है, पर वितरण पैक शून्य आधार मानकर `sunPresent` शाखा प्रयोग करें (नीला परिवेश छद्म हेतु R2, दिशात्मक चांदनी हेतु [भाग VII](internals.md) R-A देखें)
- `emission` प्रकाश गणना के बाद जुड़ता है, **`fogVisibility` से क्षीण होकर** (defaultLight कार्यान्वयन `engineColour + emission × fogVisibility`। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है)
- **फ़ॉग प्रयोग क्रम**: फ्रैगमेंट भीतर प्रक्रिया क्रम ① प्रकाश·उत्सर्जन संश्लेषण → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light हुक आह्वान → ⑤ वापसी। अतः **engineColour फ़ॉग लगा हुआ आता है**, **light हुक वापसी मान ज्यों का त्यों अंतिम रंग** (हुक बाद फ़ॉग पुनः नहीं लगता)
- **fogVisibility परिभाषा स्रोत**: दृश्य-अंतरिक्ष दूरी (शीर्ष इकाई संगणित·अंतर्वेशित)। linear विधा में `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 पर**: `fogColour` `vec3f(0.0)` (काला) होकर आता है। fogColour रंगत से समय अनुमान कोड सावधान रहे
- **वर्तमान बिल्ड वास्तविक फ़ॉग सेटिंग**: **linear स्थिर**। `fogStart` = आरेखन खंड दूरी, `fogEnd` = +1 खंड (क्षितिज ही)। फ़ॉग बंद सेटिंग में 100 / 101 खंड रखकर व्यावहारिक अमान्य। डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B) **केवल शीर्ष फ़ंक्शन से प्रयोग करें**। पैक से सीधे संदर्भ न लें। चरण दृश्यता VERTEX|FRAGMENT होने से शीर्ष फ़ंक्शन हुक बाहर मॉड्यूल-स्कोप फ़ंक्शन व vertex हुकों से भी बुलाए जा सकते हैं। गहराई टेक्सचर (binding 1) FRAGMENT-केवल होने से `bloxdOpaqueBehind()` surface / light हुक सीमित है
- **`skyLight` / `blockLight` / `heldLight` "लिफ्ट वक्र" बाद के मान** होकर आते हैं। शीर्ष टिप्पणी का `tone-mapped` इसी को कहता है: इंजन फ्रैगमेंटों पर अवश्य `y = 1-(1-x/(3-2x))³` (अंधेरे उठाने वाला S वक्र) लगाकर पैकों को देता है। कच्चे वोक्सेल मान (n/15) नहीं; जैसे पेड़ नीचे (कच्चा 0.87) **0.97 उठकर** आता है
- `skyLight` वास्तव में "उस जगह से आकाश दिखता है" का वोक्सेल अवरोध डेटा (= शैडो मानचित्र) है, मात्र चमक पैरामीटर नहीं (अध्याय 15 "छाया का सत्य")
- **`litColour` आरंभ बिंदु प्रयोज्य है**: v1 में केवल फ़ॉग लगा `engineColour` था, अतः स्वनिर्मित वातावरण अभिव्यक्ति में द्वि-फ़ॉग हो जाता था। v2 में फ़ॉग-पूर्व व उत्सर्जन-पूर्व `litColour` से आरंभ कर `bloxdApplyFog()` से अपनी गति से फ़ॉग दोबारा लगाएँ
- **`blockId` से खंड प्रकार पहचाने जा सकते हैं**: टेक्सचर वर्ण अनाश्रित पहचान। पर ID-खंड-प्रकार संगति तालिका इंजन भीतर होने से कौन ID कौन खंड दुनिया में मापें ([भाग VIII](apiv2.md) देखें)
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
