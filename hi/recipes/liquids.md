# तरल रेसिपी



## जलपृष्ठ लहर (रंग झिलमिल)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid सदा BLOXD_ALPHA — गार्ड आदतन
    #endif
    return out;
}
```

## ऊँचाई छद्म पारदर्शिता (सच्चा छिछला निर्णय नहीं)

> v1 में दृश्य गहराई व जलतल स्थिति संदर्भ असंभव था, अतः इस API भर से वास्तविक जल गहराई परिकलित नहीं हो सकती थी। v2 में तरल सीमित `bloxdOpaqueBehind()` से पीछे अपारदर्शी फलक तक मोटाई मापी जा सकती है ([भाग VIII](../history/v2.md) R-E)। नीचे इसका प्रयोग न करने वाला पुराना छद्म प्रदर्शन है, `s.position.y` स्थानीय निर्देशांक, अतः ज्यों का त्यों प्रयोग से खंड मूल विचलन से प्रभाव हटता है। विश्व ऊँचाई प्रयोग करनी हो तो `bloxdWorldPosition()` से रूपांतरित करें। नीचे केवल विश्व ऊँचाई से alpha बदलने का छद्म प्रदर्शन, तटरेखा व जलतल अनुरूप छिछला अभिव्यक्ति नहीं। `packWaterReferenceY` विश्व ऊँचाई अनुरूप समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // निम्न ऊँचाई पतला, उच्च ऊँचाई मूल alpha निकट। खेल में दिशा जाँचें।
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## जलांदर से देखा जल धुंध

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## केवल-तरल पैक (टेरेन अक्षत रचना)

```wgsl
// terrain_* हुक बिल्कुल न लिखें। तब:
//  - terrain वेरिएंट = हुकहीन = टेरेन इंजन मूल ज्यों का त्यों
//  - liquid वेरिएंट  = केवल liquid_* हुक प्रभावी
```
