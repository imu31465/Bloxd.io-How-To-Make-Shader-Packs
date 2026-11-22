# रात के रूप डिज़ाइन करना

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bbb6l5` (2026-11-20, प्रोडक्शन और preprod) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
केवल छायाएँ गहरी करने से सूर्य के न रहने पर इंजन का पूर्ण रंग (`engineColour`) उजला बना रहता है, जिससे फलक/छाया का अंतर अप्राकृतिक दिखता है। इसके बजाय पूरे पूर्ण रंग को क्षय करें।

नीचे का उदाहरण शून्य `bloxdSunDirection()` को रात और दिशात्मक सूर्य को दिन मानता है, और अंधेरे समय में टेरेन के पूर्ण रंगों को क्षय करता है। जहाँ `blockLight` और `heldLight` प्रबल होते हैं, वहाँ क्षय कमज़ोर पड़ जाता है ताकि मशाल जैसे निकट के दीये बने रहें। `0.52` एक समायोजन मान है — ज़्यादा अंधेरी रातों के लिए इसे घटाएँ।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
}
    // पूर्ण रंग क्षय करें; सामग्री की emission डिफ़ॉल्ट की तरह फ़ॉग सहित जोड़ें
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**इस विधि की सीमाएँ:** `bloxdSunDirection()` सूर्य की दिशा देता है, इसलिए उसका उल्टा (`-bloxdSunDirection()`) लेकर चंद्र दिशा निकाली जा सकती है। डिफ़ॉल्ट संसारों में सूर्य स्थिर रहता है, इसलिए चंद्रमा भी स्थिर रहता है; वह केवल दिन-रात चक्र वाले संसारों में चलता है। यदि मान केवल इकाई दिशा या शून्य हो, तो दिन और रात का अंतर पहचाना जा सकता है, लेकिन संध्या या गोधूलि का सहज बदलाव नहीं दिखाया जा सकता। यह उदाहरण टेरेन के अंतिम रंग को मंद करता है, इसलिए इंजन की दिन की रोशनी और परिवेश प्रकाश दोनों को साथ कम करता है; यह पूरे दिन के प्रकाश को पुनःनिर्मित नहीं करता। तरलों पर लागू करने से पहले उनके हुक का फ़ॉलबैक संबंध जाँचें।
