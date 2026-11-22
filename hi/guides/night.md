# रात के रूप डिज़ाइन करना

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bbb6l5` (2026-11-20, प्रोडक्शन और preprod) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
केवल छायाओं को गहरा करने पर सूर्य न होने की स्थिति में भी इंजन का अंतिम रंग (`engineColour`) उजला रह सकता है। इससे रोशन सतहों और छाया वाले हिस्सों के बीच का अंतर अस्वाभाविक दिखता है। इसलिए केवल छायाओं के बजाय पूरे अंतिम रंग की चमक घटाएँ।

नीचे दिए गए उदाहरण में `bloxdSunDirection()` का मान शून्य होने पर रात और शून्य से अलग होने पर दिन माना जाता है। रात के समय terrain के अंतिम रंग की चमक घटाई जाती है। जहाँ `blockLight` या `heldLight` का मान अधिक होता है, वहाँ यह प्रभाव हल्का रखा जाता है ताकि मशाल जैसे पास के प्रकाश-स्रोत दिखाई देते रहें। `0.52` को बदला जा सकता है; रात को और अंधेरा करने के लिए इसे कम करें।

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

**इस तरीके की सीमाएँ:** यदि `bloxdSunDirection()` सूर्य मौजूद होने पर इकाई दिशा-वेक्टर और सूर्य न होने पर शून्य लौटाता है, तो इससे दिन और रात का अंतर पता चल सकता है, लेकिन सुबह या गोधूलि के बदलते प्रकाश का सहज अनुमान नहीं लगाया जा सकता। अंतिम रंग की चमक घटाने से इंजन की दिन की रोशनी और परिवेशी रोशनी भी एक साथ कम होती हैं। इसलिए यह पूरे दिन के प्रकाश-परिवर्तन को पुनः निर्मित नहीं करता। यही तरीका तरलों पर लागू करने से पहले संबंधित liquid hooks के fallback व्यवहार की जाँच करें।
