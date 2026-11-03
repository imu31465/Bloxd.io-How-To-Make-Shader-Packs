# रात्रि "छाया काली फलक उजला" सुधारें



केवल छाया दबाने से, सूर्य अनुपस्थिति में इंजन पूर्ण रंग (`engineColour`) अब भी उजला रहता है, फलक-छाया अंतर अप्राकृतिक दिखता है। पूर्ण रंग समग्र क्षय लगाकर उत्तर दें।

नीचे उदाहरण `bloxdSunDirection()` शून्य रात्रि निर्णय, दिशायुक्त दिन निर्णय मान, रात्रि टेरेन पूर्ण रंग क्षय करता है। `blockLight` व `heldLight` प्रबल स्थल क्षय घटाकर, मशाल आदि निकट प्रकाश यथासंभव रखें। `0.52` समायोज्य मान है, अधिक अंधेरा चाहिए तो घटाएँ।

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
    // पूर्ण रंग क्षय, सामग्री emission डिफ़ॉल्ट अनुसार फ़ॉग सहित योग
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**इस निरूपण की सीमा:** यदि `bloxdSunDirection()` "सूर्य=इकाई दिशा, नहीं=शून्य" द्विमान हो, दिन-रात पृथक् संभव पर संध्या क्षीण सतत अनुमान असंभव। और पूर्ण रंग क्षय से, इंजन दिन-प्रकाश व परिवेश एक साथ क्षीण होते हैं, पूर्ण कालपट्टी पुनरुत्पादन नहीं। तरल भी वही निरूपण चाहिए तो तरल हुक वापसी संबंध जाँचें।
