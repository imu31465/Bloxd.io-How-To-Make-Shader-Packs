# पानी को प्राकृतिक दिखाना

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
यह API सीन का रंग सैंपल नहीं कर सकता, इसलिए यह **फ्रेनेल-शैली रंग मिश्रण और सूर्य हाइलाइट वाली छद्म स्टाइलिंग है, वास्तविक परावर्तन/अपवर्तन नहीं** (गहराई का गणित केवल-तरल `bloxdOpaqueBehind()` से करता है — मोटाई-अवशोषण रेसिपी इसी पृष्ठ पर आगे दी है)। नीचे का नमूना आधार रंग रखता है, छिछले देखने के कोणों पर थोड़ा आकाश-जैसे रंग की ओर मिलाता है, और केवल तभी एक छोटी चमक जोड़ता है जब सूर्य मौजूद हो।

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

समायोजन संकेत:

- पानी सफ़ेद/धुला-हुआ दिखे: `fresnel * 0.38` में `0.38` और चमक का `0.55` घटाएँ।
- पानी बहुत गहरा दिखे: थोड़ा और `fakeSkyReflection` मिलाएँ। बहुत ज़्यादा प्लास्टिक जैसा दिखता है।
- पानी पर रेखाएँ या नियमित धारियाँ: तरंग आवृत्तियाँ और चमक की तीव्रता घटाएँ। इस कोड में कोई मेश शीर्ष विस्थापन नहीं है।
- वास्तविक दृश्य प्रतिबिंब चाहिए: इस API के इनपुट में स्क्रीन का रंग नहीं है, इसलिए रंग मिलाने से कभी वास्तविक परावर्तन नहीं बनता (गहराई केवल तरल के लिए है — [Functions: bloxdOpaqueBehind](../api/functions.md) देखें)।

यह रेसिपी किसी मौजूदा `bloxdLiquidLight` को **प्रतिस्थापित** करती है। इसे R9.7 के समनाम तरंग फ़ंक्शन या अन्य समनाम हुकों के साथ चिपकाएँ नहीं।


## शेडर पैकों के साथ जलमग्न वास्तविकता



जलमग्न दृश्य 3 परतों से बनते हैं:

| परत | सामग्री | पैकों से संचालनीय? |
|---|---|---|
| ① टेरेन/तरल रेंडरिंग | हुक-प्रक्रियायोग्य। लाइट हुक पानी के नीचे सामान्य रूप से बुलाए जाते हैं | हाँ ("आवरण के नीचे" काम करता है) |
| ② तरल-परिभाषा आवरण | कैमरा स्थिति पर तरल ब्लॉक परिभाषा के color/alpha से बना emissive फुलस्क्रीन quad, सबसे आगे बनाया जाता है। खेल की सेटिंग `cameraTint` सेट होने पर वही जीत जाती है | नहीं (न रंग बदल सकते हैं, न सघनता) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक पानी के नीचे भी काम करते रहते हैं / आवरण हटाया नहीं जा सकता / जलमग्न होने की स्थिति में ब्रांच नहीं की जा सकती (fogStart / fogEnd / fogColour पानी के नीचे नहीं बदलते, इसलिए fogAlpha भी इसे पहचान नहीं सकता)।
