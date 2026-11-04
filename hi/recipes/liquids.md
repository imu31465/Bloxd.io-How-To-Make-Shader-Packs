# तरल

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
## लहराती सतह (रंग झिलमिल)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid में सदा BLOXD_ALPHA होता है — गार्ड आदत के तौर पर रखा गया
    #endif
    return out;
}
```

## ऊँचाई से छद्म गहराई-आधारित पारदर्शिता (वास्तविक छिछलापन-परीक्षण नहीं)

> सच्ची जल-गहराई के लिए केवल-तरल `bloxdOpaqueBehind()` चाहिए, जो पीछे के अपारदर्शी फलक तक मोटाई मापता है (पूरी रेसिपी: [पानी को प्राकृतिक दिखाना](../guides/water.md))। नीचे का उसके बिना एक सरल छद्म स्टाइलिंग है: `s.position.y` स्थानीय निर्देशांक है, इसलिए इसे कच्चा प्रयोग करने पर खंड मूल बदलने के साथ-साथ प्रभाव खिसकता है। विश्व ऊँचाई के लिए `bloxdWorldPosition()` से रूपांतरित करें। नीचे दिया गया केवल विश्व ऊँचाई से अल्फा बदलता है — छद्म प्रभाव है, तटरेखा/तल-जागरूक छिछलापन नहीं। `packWaterReferenceY` को अपनी दुनिया की ऊँचाई के अनुसार समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // निम्न ऊँचाई पर पतला, ऊपर आधार अल्फा के करीब; दिशा खेल में सत्यापित करें
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## भीतर से जलमग्न धुंधलापन

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## केवल-तरल पैक (टेरेन अछुता)

```wgsl
// terrain_* हुक बिल्कुल न लिखें। तब:
//  - terrain वेरिएंट = हुक नहीं = टेरेन के लिए इंजन डिफ़ॉल्ट
//  - liquid वेरिएंट  = केवल liquid_* हुक प्रभावी
```
