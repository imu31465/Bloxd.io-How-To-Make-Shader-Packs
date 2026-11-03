# जल प्राकृतिक दिखाने वाली जल समेकित रेसिपी



यह API दृश्य वर्ण नमूना नहीं ले सकता, अतः **फ्रेनेल पवन वर्ण मिश्रण व सूर्य झलक छद्म अभिव्यक्ति है, वास्तविक परावर्तन/अपवर्तन नहीं** (जल गहराई परिकलन v2 `bloxdOpaqueBehind()` से संभव होकर [भाग VIII](../history/v2.md) R-E में पृथक)। नीचे आधार वर्ण रखते हुए, छिछले दृष्टिकोण निकट-आकाश वर्ण मिलाकर, केवल सूर्य रहते छोटी चमक जोड़ने का नमूना है।

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

समायोजन संदर्भ:

- जल श्वेत/अति उजला: `fresnel * 0.38` का `0.38` व चमक `0.55` घटाएँ।
- जल अति सघन: `fakeSkyReflection` मिश्रण अनुपात थोड़ा बढ़ाएँ। पर अधिक प्लास्टिक जैसा।
- जलपृष्ठ रेखा व नियमित धारी दिखे: तरंग आवृत्ति व चमक तीव्रता घटाएँ। इस कोड में जलपृष्ठ जाल शीर्ष विस्थापन नहीं।
- वास्तविक दृश्य प्रतिबिंब चाहिए: इस API निवेश में परदा वर्ण नहीं, केवल वर्ण मिश्रण से सत्य परावर्तन नहीं (गहराई तरल सीमित उपलब्ध। [भाग VIII](../history/v2.md) R-E)।

यह रेसिपी **विद्यमान `bloxdLiquidLight` प्रतिस्थापित** करती है। R9.7 समनाम तरंग अभिलंब फ़ंक्शन व अन्य समनाम हुकों से दुहरा चिपकाएँ नहीं।


## शेडर पैकों सहित जलांत सत्य



जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogVisibility भी संसूचित नहीं करता)।
