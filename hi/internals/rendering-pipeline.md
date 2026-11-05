# रेंडरिंग पाइपलाइन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bny9u` (2026-11-05, production) · स्थिति: Analyzed (प्रोडक्शन-बंडल JavaScript विश्लेषण)

- **Surface हुक alphaTest से "पहले" चलते हैं**: `out.alpha` सीधे discard परीक्षण को खिलाता है। कटआउट सामग्री (घास, पत्ते) dissolve-शैली के डाइथर प्रभाव की अनुमति देती है (रेसिपी R-C)। लिक्विड (ब्लेंडेड) के लिए `out.alpha` असली पारदर्शिता है (रेसिपी R-D)। सामान्य अपारदर्शी terrain पर कोई प्रभाव नहीं — ग़लत न समझें
- **`l.ambient` की सामग्री** `material.ambient × sceneAmbient` है, सामग्री के अनुसार भिन्न। Scene-पक्ष ग्राफ़िक्स सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5) से जुड़ा है — डिफ़ॉल्ट कभी हार्डकोड न करें
- **Scene के दिशात्मक प्रकाश 2-प्रकाश सेटअप हैं**: मुख्य प्रकाश (दिशा आकाश सेटिंग की सूर्य-स्थिति से, तीव्रता 1.0) और फ़िल प्रकाश (दिशा `[-0.5, -1, -1]`, तीव्रता 0.35) का लैम्बर्ट योग `l.directional` तक पहुँचता है। फ़िल प्रकाश नीचे की ओर इशारा करता है, इसलिए ऊपरी फलकों में कुछ नहीं जोड़ता और नीचे-देखने वाली सतहों (गुफ़ा-छतें आदि) को उठा लेता है। Terrain केवल `_initScene` में जोड़े गए प्रकाशों पर विचार करता है; स्टार्टअप के बाद scene में जोड़े गए प्रकाश terrain और ब्लॉक मॉडल नज़रअंदाज़ कर देते हैं (एक आधिकारिक चेतावनी संदेश ऐसा ही कहता है)
- **`bloxdSeconds()` असल में `performance.now()` है**: ब्राउज़र का अपटाइम 1 घंटे पर लपेटा जाता है। इन-गेम दिन/रात और दुनिया के बीते समय से असंबंधित। गेम घड़ी से सिंक एनीमेशन के लिए दिन-रात-चक्र दुनियाओं में `bloxdSunDirection()` के एज़िमुथ से समय का अनुमान लगाएँ
- **हेडर फ़ंक्शन एक uniform पढ़ते हैं**: इंजन 64-बाइट `bloxdPackInputs` uniform को `@group(3) @binding(0)` पर रखता है (5 स्लॉट — seconds / lit / renderOffset / sunDirection / eyePosition, लिटिल-एंडियन), और `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` उन स्लॉटों को पढ़ने से मेल खाते हैं ([पैक फ़ॉर्मैट: प्रति-फ़्रेम uniform](../api/pack-format.md#प्रति-फ़्रेम-uniform-bloxdpackinputs))। पैक इस uniform को लिख नहीं सकते, और चूँकि पैक और इंजन का WGSL एक ही मॉड्यूल में घुल जाता है, वही group/binding ख़ुद घोषित करना भी असंभव है। `@group(3) @binding(1)` पर लिक्विड scene-depth टेक्सचर है, और `@binding(2)` पर `bloxdSpTextureLayers` स्टोरेज बफ़र
- **Vertex डेटा मेशर (Web Worker) बनाता है**: ब्लॉक terrain प्रति vertex 28 बाइट (एटलस चालू होने पर 32 बाइट) पर इंटरलीव्ड होता है — position = float32×3 / normal = 8-bit signed integer×4 / colour = 8-bit normalized integer×4 (`s.colour` का असली तत्व — tint × AO मेशर चरण में ही 8-bit में बेक होता है, इसलिए उसे पैक-पक्ष से अलग करना या बहाल करना सैद्धांतिक रूप से असंभव है) / UV = float32×2 / atlasIndex = float32। केवल लाइट-लेवल अलग 4-बाइट vertex बफ़र में चलते हैं (मापे गए मान: [इंजन डेटा लेजर](engine-data.md))। Vertex प्रति-खंड instancing से खिंचते हैं
- लोडिंग के दौरान खंड-सीमाओं पर बारीक चेकर पैटर्न इंजन का स्क्रीन-स्पेस Bayer 4×4 डाइथर खंड-फ़ेड है, पैक की ख़राबी नहीं (ग्राफ़िक्स सेटिंग `chunkFadeIn` से बंद करें)
- **`mod` एक आरक्षित शब्द है**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` के साथ अस्वीकृत। शेषफल `%` ऑपरेटर से लिखें

## R-C. Bayer डाइथर dissolve — out.alpha, discard चलाता है

खंड-फ़ेड के लिए इंजन जिस **उसी Bayer 4×4 तालिका** का उपयोग करता है, उसे दोहराता है — नीचे के ब्लॉकों से ऊपर की ओर कटआउट घोलता है। alphaTest सामग्री (घास, पत्ते) पर discard चलता है; लिक्विड में यह ब्लेंड पारदर्शिता बन जाता है।

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod आरक्षित है, इसलिए % ऑपरेटर उपयोग करें
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
    // नीचे के ब्लॉकों से ऊपर की ओर dissolve; ऊँचा dissolve बना रहता है
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. कैमरा-निकट पानी-फ़ेड — लिक्विड alpha दृष्टि-रेखाएँ रखता है

Liquid-हुक का `out.alpha` सीधे ब्लेंडिंग को खिलाता है। डाइविंग/पानी-से-ऊपर कैमरा दृष्टि-रेखाएँ बनाए रखने के लिए कैमरा के ठीक नीचे की पानी-सतह को फ़ेड करता है।

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 ब्लॉक पर पूरी तरह पारदर्शी → सामान्य
    #endif
    return out;
}
```
