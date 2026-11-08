# टेक्सचर API

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` · स्थिति: Verified (v4 से API अपरिवर्तित, v5 बिल्ड पर पुनः पुष्ट की गई)

गेम के अपने टेक्सचर पढ़ने का API: दो फ़ंक्शन, एक नामित-स्थिरांक परिवार, और चार इनपुट फ़ील्ड। हेडर की अपनी एक-पंक्ति: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **कहाँ से कॉल किया जा सकता है**: **केवल सरफ़ेस / लाइट हुक** (इसे वर्टेक्स हुक से पहुँचाने पर "reaches" डायग्नोस्टिक के साथ विफलता मिलती है)

यह टेक्सल को पढ़ता है **ठीक उसी तरह जैसे इंजन का अपना सैंपलर पढ़ता है** — वही `texture_2d_array<f32>` एटलस, वही सैंपलर, `round(mipLevel)` पर `textureSampleLevel` — इसलिए आपका पढ़ा हुआ टेक्सल संरचनात्मक रूप से उसी टेक्सल से मेल खाता है जिसे इंजन ने अंकित किया।

### `bloxdTexel` क्या पढ़ता है, वह पाइपलाइन पर निर्भर करता है

इंजन प्रत्येक पाइपलाइन के लिए `bloxdTexel` की अलग परिभाषा जेनरेट करता है, इसलिए एक फ़ंक्शन के तीन व्यवहार हैं:

| पाइपलाइन | `textureId == 0` | ग़ैर-शून्य `textureId` | टिप्पणियाँ |
|---|---|---|---|
| **एटलस पाइपलाइन** — टेरेन, लिक्विड और ब्लॉक एटलस से अंकित ब्लॉक मॉडल | `vec4f(1.0)` (सफ़ेद — "कोई टेक्सचर नहीं") | उस **एटलस प्रविष्टि** को सैंपल करता है | नामित स्थिरांक लागू होते हैं; एनीमेशन और रोटेशन स्वचालित हैं |
| **ओन-टेक्सचर पाइपलाइन** — जिन मॉडलों की मेश अपना डाइफ़्यूज़ टेक्सचर ले चलती है (प्लेयर स्किन, मॉब टेक्सचर, आइटम स्प्राइट) | आपके दिए गए uv पर **मेश के अपने टेक्सचर** को सैंपल करता है | `vec4f(1.0)` (सफ़ेद) | स्कोप में ठीक एक टेक्सचर होता है; नामित स्थिरांक लागू नहीं होते |
| **टेक्सचर-रहित पाइपलाइन** | सफ़ेद | सफ़ेद | स्टब; `bloxdTextureSize() -> vec2u(1u)` |

एटलस-पाइपलाइन की अर्थव्यवस्था विस्तार से:

- **`textureId == 0` हमेशा `vec4f(1.0)` (सफ़ेद) लौटाता है।** यही "कोई टेक्सचर नहीं" वाला id है; टेक्सचर-रहित फ़ेस चारों इनपुट फ़ील्ड में 0 ले चलते हैं, इसलिए `bloxdTexel(surface.textureId, ...)` को कॉल करना हमेशा सुरक्षित है
- **एनीमेटेड टेक्सचर स्वचालित रूप से मौजूदा फ़्रेम लौटाते हैं।** फ़्रेम गेम की एनीमेशन घड़ी पर बढ़ते हैं — आप उन्हें रोक नहीं सकते, कदम-दर-कदम नहीं चला सकते, और कभी ज़रूरत भी नहीं पड़ती
- **`mipLevel` ठीक वैसे ही क्लैंप होता है जैसे इंजन का अपना**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; सीमा-बाहर मिप त्रुटि देने की बजाय सैचुरेट हो जाते हैं
- **फ़्रैगमेंट के अपने `textureRotation` को आपके दिए uv पर लागू किया जाता है** (नीचे देखें)

एटलस पाइपलाइनों में `textureId` **1-आधारित** है: `bloxdTextureIdGrassTop` ही id है, और इंजन जिस एटलस लेयर को इसके लिए सैंपल करता है वह `id - 1` है। Id प्रति टेक्सचर *नाम* स्थिर रहते हैं, प्रति एटलस स्लॉट नहीं — इंजन बिल्डों के पीछे एटलस को फिर से शफ़ल करता है, पर नाम-आधारित तुलना अपना अर्थ बनाए रखती है।

### सार्वभौमिक कॉल पैटर्न

```wgsl
// हर पाइपलाइन में काम करता है: एटलस फ़ेसों पर यह एटलस प्रविष्टि सैंपल करता है;
// ओन-टेक्सचर मॉडलों पर textureId 0 होता है और यह मॉडल का अपना टेक्सचर सैंपल करता है।
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` में पहले से ही `texture × tint × ambient occlusion` शामिल है (स्किन और टिंट समेत), इसलिए टेक्सल रीड *अतिरिक्त* विवरण के लिए हैं — ल्यूमिनेंस अनुमान, प्रति-टेक्सचर प्रभाव — बेस रंग को फिर से खड़ा करने के लिए नहीं।

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **कहाँ से कॉल किया जा सकता है**: केवल सरफ़ेस / लाइट हुक

`textureDimensions(textureAtlas0, <clamped mip>)`। हर टेक्सचर एक ऐरे लेयर घेरता है, इसलिए यह *उस मिप पर किसी भी एक टेक्सचर का टेक्सल आकार* भी है (एटलस टियर के सभी ब्लॉक टेक्सचर एक ही वर्गाकार आकार के होते हैं)।

```wgsl
// "पिक्सल-आर्ट" लुक के लिए टेक्सल-अलाइंड रीसैंपलिंग
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## मॉडल-स्वामित्व टेक्सचर (textureId: 0)

हेडर टिप्पणी: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — अधिकांश मॉडल फ़ेसों का कोई *एटलस* टेक्सचर नहीं होता, क्योंकि उनकी मेश अपने टेक्सचर खुद ले चलती है:

- **प्लेयर स्किन** और दूसरे नॉन-एटलस मॉडल टेक्सचर (मॉब, आइटम स्प्राइट) `textureId: 0` के रूप में आते हैं
- उन पाइपलाइनों पर `bloxdTexel(0u, uv, mip)` **मेश के अपने टेक्सचर** को सैंपल करता है (ऊपर की टेबल देखें); कोई भी ग़ैर-शून्य id सफ़ेद लौटाता है — स्कोप में कोई एटलस नहीं होता
- हेडर के फ़ील्ड डॉक्यूमेंट के अनुसार ही काम करते हैं: `uv` मॉडल टेक्सचर पर 0–1 तक फैला होता है, `mipLevel` फ़ेस का मिप होता है
- **`bloxdTextureSize()`** *उस टेक्सचर का आकार* बताता है जिसे पाइपलाइन सैंपल करती है: एटलस पाइपलाइन पर एटलस, ओन-टेक्सचर पाइपलाइन पर मॉडल का अपना टेक्सचर

जो प्रभाव केवल एटलस फ़ेसों पर ही अर्थ रखते हैं, उन्हें गार्ड के भीतर रखना चाहिए:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // केवल वे फ़ेस जिनका टेक्सचर ब्लॉक एटलस में रहता है (ब्लॉक मॉडल)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **स्किन बनाम एटलस**: एटलस टेक्सचर *नामों* को लेयरों पर मैप करता है और `bloxdTextureId*` से तुलनीय है। मॉडल-स्वामित्व टेक्सचर (स्किन) उस नेमस्पेस में नहीं होते और id 0 के रूप में आते हैं। `surface.colour` में पहले से skin × tint शामिल है, इसलिए उसी से आगे बढ़ें

## bloxdTextureId*: नामित टेक्सचर स्थिरांक

हर प्रयोग-योग्य टेक्सचर नाम एक तुलनीय `const` बन जाता है। **स्पेलिंग फ़ाइल नाम का CamelCase रूप है**:

| टेक्सचर फ़ाइल | स्थिरांक | टिप्पणी |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | इंजन का अपना उदाहरण |
| `lava0.png` (फ़्रेम `lava0`–`lava7`) | `bloxdTextureIdLava` | एनीमेशन परिवार: कैननिकल नाम से फ़्रेम सफ़िक्स गिर जाते हैं |
| `black_portal0.png` (फ़्रेम 0–3) | `bloxdTextureIdBlackPortal` | वही नियम |
| `radar_screen0` (टर्न्ड प्रतियाँ `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | रोटेशन परिवार: मूल नाम पर फ़ोल्ड होता है |

### स्पेलिंग नियम और नामकरण स्वतंत्रता

- **जेनरेशन नियम** (वैलिडेटर से पुनर्स्थापित): नाम को ग़ैर-अल्फ़ान्यूमेरिक रनों पर तोड़ें, हर हिस्से का कैपिटलाइज़ेशन करें, `bloxdTextureId` प्रीफ़िक्स के बाद जोड़ दें
- **केस और अंडरस्कोर का भेद नहीं होता**: रिवर्स मैचिंग (पैक द्वारा लिखा नाम → रजिस्ट्री नाम) आपकी और इंजन दोनों की स्पेलिंग फ़ोल्ड कर देती है, इसलिए जैसे `bloxdTextureIdGrassTop` और `bloxdTextureId_grass_top` **एक ही स्थिरांक** पर रिज़ॉल्व होते हैं
- **एनीमेटेड टेक्सचर फ़्रेम नंबर नहीं लेते**: `lava` ही नाम है; `lava0` एक समर्पित त्रुटि है
- **रोटेशन परिवार मूल नाम उपयोग करते हैं**: टर्न्ड-कॉपी स्पेलिंग लिखने पर एक समर्पित संदेश बनता है

### नाम-रिज़ॉल्यूशन त्रुटियाँ (वैलिडेटर से अक्षरशः)

> **प्रीफ़िक्स की ग़लत स्पेलिंग / केस:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **एनीमेशन फ़्रेम:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **टर्न्ड कॉपी:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **फ़ोल्ड के बाद अस्पष्ट:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **नहीं मिला (सुझाव के साथ):** `There's no texture called X. Did you mean bloxdTextureIdY?` — सुझाव की थ्रेशोल्ड Levenshtein दूरी `max(2, floor(len/4)) + 1` है
>
> **नहीं मिला (बिना सुझाव):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> उस संदेश में `BLOCK_TEXTURES.md` गेम की अपनी आंतरिक टेक्सचर-नाम सूची है, जिसे इंजन का वैलिडेटर संदर्भित करता है — यह इस साइट का कोई पेज नहीं है। यहाँ इसका तुल्य [टेक्सचर कैटलॉग](texture-catalog.md) है।

### केवल संदर्भित स्थिरांक ही उत्सर्जित होते हैं

हेडर का `bloxdTextureId*` ब्लॉक **प्रति पैक** उन नामों से जेनरेट होता है जिन्हें वह वास्तव में संदर्भित करता है — 3 स्थिरांक उपयोग करने वाले पैक को 3 `const` पंक्तियाँ मिलती हैं, ~900 नहीं।

## इनपुट फ़ील्ड

`BloxdSurfaceIn` / `BloxdLightIn` पर मौजूद चार टेक्सचर फ़ील्ड:

| फ़ील्ड | टाइप | विवरण |
|---|---|---|
| `textureId` | `u32` | इस फ़ेस का टेक्सचर; `bloxdTextureId*` से तुलना करें; 0 = कोई नहीं |
| `textureRotation` | `u32` | घड़ी की दिशा में चौथाई घुमाव (0–3), `bloxdTexel` द्वारा लागू |
| `uv` | `vec2f` | टेक्सचर 0–1 पर फैला होता है; `fract(uv)` अंकित किया जाता है |
| `mipLevel` | `f32` | मिप स्तर: 0 = पूरा आकार, 1 = आधा… |

## रोटेशन की बारीकी — एक न्यूट्रल सैंपलर

`bloxdTexel` आपके दिए uv को **मौजूदा फ़्रैगमेंट के** `textureRotation` से उलट दिशा में घुमाता है — चाहे आपने कौन-सा भी id दिया हो। दो आम स्थितियाँ:

- `surface.uv` से **इसी फ़ेस के अपने टेक्सचर का पुनः सैंपल** — uv फ़ेस के घुमे हुए फ़्रेम में होता है और उलट-रोटेशन उसे वापस एटलस स्पेस पर मैप करता है; यही अभीष्ट प्राथमिक उपयोग है
- फ़ेस घुमे हुए होने पर एटलस-स्पेस uv से **किसी दूसरे टेक्सचर का सैंपल** — उलट-रोटेशन तब भी चलता है और सैंपल घुमा हुआ लैंड करता है। यही जाल है

इंजन प्रति-टेक्सचर रोटेशन नहीं देख सकता (रोटेशन फ़ेस का ज्यामिति डेटा है) और हमेशा फ़्रैगमेंट का मान उपयोग करता है। किसी दूसरे टेक्सचर को रोटेशन-न्यूट्रल ढंग से सैंपल करने के लिए, uv को उसी चौथाई घुमाव से पहले ही घुमा दें ताकि वह कैंसल हो जाए:

```wgsl
// रोटेशन-न्यूट्रल टेक्सल सैंपलिंग: uv को पहले से घुमाएँ ताकि bloxdTexel का उलट-रोटेशन
// (इस फ़ेस के textureRotation द्वारा) कैंसल हो जाए। surface.textureRotation को r के रूप में पास करें।
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` को किसी सुधार की ज़रूरत नहीं। अधिकांश फ़ेस 0 ले चलते हैं, पर वितरित किए जाने वाले पैक इसे मान न लें।)

## हल सहित उदाहरण

### टेक्सल ल्यूमिनेंस से उत्सर्जन

दूरी-सहनशील नरम ब्लॉकी औसत के लिए फ़ेस के एक मिप ऊपर से सैंपल लें:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### टेक्सचर-विशिष्ट प्रभाव

चुने हुए टेक्सचरों को अलग करने के लिए `textureId` से तुलना करें (जैसे चमकते अयस्कों का आधिकारिक तरीका):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### डेप्थ-ऑफ़-फ़ील्ड-शैली की दूरी ब्लर

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // डिवीज़न गार्ड
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(अनुपात की यह चाल इंजन के `colour = texture × tint × AO` को बनाए रखती है: ब्लेंड किए टेक्सल को मूल टेक्सल से भाग देने पर टेक्सचर-सामग्री कैंसल हो जाती है और सिर्फ़ ब्लर गुणक बचता है, जिसे `surface.colour` में वापस गुणा दिया जाता है। सफ़ेद रीड — टेक्सचर-रहित फ़ेस — गार्ड को प्रभाव छोड़ने देती हैं।)

## जहाँ टेक्सचर API नहीं पहुँच सकता

- **वर्टेक्स हुकों से कॉल नहीं हो सकता** — "reaches" डायग्नोस्टिक इसे अस्वीकार कर देते हैं
- **आप टेक्सचर नहीं जोड़ सकते** — एटलस इंजन का है; API केवल उसे पढ़ता है। कस्टम टेक्सचर टेक्सचर-पैक तंत्र का काम बने रहते हैं
- **नॉन-एटलस रेंडरर कॉन्फ़िगरेशन स्टब में गिर जाते हैं** — `bloxdTextureSize() -> vec2u(1u)` और `bloxdTexel(...) -> vec4f(1.0)`, चारों इनपुट `0u, 0u, vec2f(0.0), 0.0` बहते हुए। असली एटलस के लिए लिखा गया कोड फिर भी कंपाइल होकर चलता है — बस उसे सफ़ेद टेक्सल और 1×1 आकार दिखते हैं। जो कोड `textureId == 0` सह लेता है, यह भी सह ले लेता है

## संबंधित

- **सभी 896 प्रयोग-योग्य नाम** → [टेक्सचर कैटलॉग](texture-catalog.md)
- [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md) · [टेक्सचर सैंपलिंग](../internals/texture-sampling.md)
