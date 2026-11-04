# रात के रूप डिज़ाइन करना

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
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

**इस सुधार की सीमाएँ:** यदि `bloxdSunDirection()` "सूर्य के साथ इकाई दिशा, सूर्य के बिना शून्य" जैसा व्यवहार करे, तो दिन/रात पहचाने जा सकते हैं पर संध्या/गोधूलि का सहज अनुमान नहीं। और चूँकि यह पूर्ण रंग को क्षय करता है, यह इंजन के दिन के प्रकाश और परिवेश को एक साथ कमज़ोर कर देता है — पूर्ण समय-स्तरीय पुनरुत्पादन नहीं। तरलों पर भी यही लागू करना हो तो तरल हुक के फ़ॉलबैक संबंध की जाँच करें।
