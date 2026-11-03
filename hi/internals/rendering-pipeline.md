# पाइपलाइन विवरण



- **surface हुक alphaTest "पूर्व" चलते हैं**: `out.alpha` सीधे त्याग परीक्षण खिलाता है। कटआउट सामग्री (घास, पत्ते) dither-ढंग विलयन प्रभाव अनुमति (रेसिपी R-C)। तरलों (मिश्रण) में `out.alpha` वास्तविक पारदर्शिता है (रेसिपी R-D)। सामान्य अपारदर्शी टेरेन पर प्रभाव नहीं — भ्रमित न हों
- **`l.ambient` सामग्री** `material.ambient × sceneAmbient` है, सामग्री अनुसार भिन्न। दृश्य पक्ष ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5) बाँधता है — नियत डिफ़ॉल्ट कभी न प्रोग्राम करें
- **दृश्य की दिशात्मक रोशनी 2 लैंपों की बनी है**: मुख्य लैंप (दिशा आकाश सेटिंग के सूर्य-स्थान से, तीव्रता 1.0) और फ़िल लैंप (दिशा `[-0.5, -1, -1]`, तीव्रता 0.35) का Lambert योग `l.directional` तक पहुँचता है। फ़िल लैंप की दिशा नीचे है, अतः ऊपरी सतह पर योगदान नहीं देता, नीचे मुख वाली सतहों (गुफा की छत आदि) को उठाता है। टेरेन केवल `_initScene` में जोड़े गए लैंप गिनता है; शुरू होने के बाद दृश्य में जोड़े गए लैंप टेरेन व खंड-मॉडल से अनदेखे रहते हैं (आधिकारिक चेतावनी पाठ मौजूद है)
- **`bloxdSeconds()` का वास्तविक रूप `performance.now()` है**: `time() { return performance.now() / 1e3 % 3600 }` — ब्राउज़र के चालू होने से बीता समय, जो 1 घंटे पर लौटता है। खेल के दिन-रात या दुनिया के बीते समय से कोई संबंध नहीं। खेल घड़ी से समकालिक एनिमेशन हेतु दिन-रात चक्र वाली दुनिया में `bloxdSunDirection()` के दिगंश से अनुमान लगाना व्यावहारिक है
- **हेडर फ़ंक्शनों का आधार एक ही uniform है**: इंजन `@group(3) @binding(0)` पर 64 बाइट uniform (time / originOffset / sunDirection / eyePosition के 4 स्लॉट, little-endian) रखता है, और `bloxdSeconds()`, `bloxdRenderOffset()`, `bloxdSunDirection()`, `bloxdEyePosition()` उन्हीं स्लॉट के पठन हैं। `originOffset` वर्तमान बिल्ड में सदा `[0, 0, 0]` है (फ़्लोटिंग-पॉइंट विश्व निर्देशांक हेतु आरक्षित स्लॉट)। पैक इस uniform को बदल नहीं सकता, और पैक व इंजन की WGSL एक ही मॉड्यूल में मिलाई जाती है, अतः वही group/binding स्वयं घोषित करना भी संभव नहीं। (v3 में दो स्लॉट बदले — `seconds` / `renderOffset`; फ़ंक्शन अब `bloxdSeconds()` / `bloxdRenderOffset()` हैं — और `@group(3) @binding(1)` पर दृश्य-गहराई texture जोड़ा गया; [भाग IX](../history/v3.md) §41 व §51 देखें।)
- **शीर्ष डेटा मेशर (Web Worker) बनाता है**: खंड टेरेन को प्रति शीर्ष 28 बाइट (atlas सहित 32 बाइट) इंटरलीव्ड रूप में सजाता है — स्थिति = float32×3 / अभिलंब = 8bit signed int×4 / रंग = 8bit अर्ध-पूर्णांक×4 (`s.colour` का वास्तविक रूप — tint × AO मेशर चरण में ही 8bit में पकाए जाते हैं, पैक से अलग करना/पुनः प्राप्त करना सैद्धांतिक रूप से असंभव) / UV = float32×2 / atlasIndex = float32। केवल लाइट-लेवल अलग 4 बाइट शीर्ष बफ़र में चलते हैं ([भाग VII](../internals/) §26 · [भाग II](../api/) §11)। शीर्ष चंक-इकाई instancing से खींचे जाते हैं
- लोड के समय खंड सीमाओं पर दिखने वाला महीन चेकर पैटर्न इंजन का परदा-अंतरिक्ष Bayer 4×4 dither खंड फ़ेड है, पैक बग नहीं (ग्राफिक सेटिंग में `chunkFadeIn` बंद करने पर अक्षम हो जाता है)
- **`mod` आरक्षित शब्द है**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` से अस्वीकृत। शेष `%` ऑपरेटर से लिखें

## R-C. Bayer dither विलयन — out.alpha त्याग नियंत्रित करता है

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. जल निकट-कैमरा फ़ेड — तरल alpha दृष्टि स्पष्ट रखता है

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
