# प्रकाश

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
## कंट्रास्ट S-वक्र

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## दूरी की धुंध (स्वनिर्मित फ़ॉग)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 से 192 ब्लॉक के बीच 0..0.35 स्वनिर्मित फ़ॉग जोड़ें
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## रात (skyLight-संचालित नीला झुकाव + दीया रक्षा)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## पूर्ण-अंधेरी गुफ़ाएँ (आकाशहीन क्षेत्र और भी गहरे करना)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` लिफ्ट-बाद का मान आता है (अध्याय 10), इसलिए हल्का अवरोध (जैसे पेड़ के नीचे: कच्चा 0.87 → लिफ्ट के बाद 0.97) इस विधि से लगभग गहरा नहीं होता। यह गुफ़ाओं (कच्चा 0) पर काम करता है। "पेड़ की छाया" को तेज़ करने के लिए R9.12 की लिफ्ट-व्युत्क्रम + देहली विधि प्रयोग करें।

## रात का नीला परिवेश (चंद्र दिशा के बिना छद्म रूप)

> इस API में आकाश में सूर्य न होने पर `bloxdSunDirection()` शून्य हो जाता है। नीचे दिया गया दिशात्मक चांदनी नहीं है, बस अंधेरे आकाश पर जोड़ा गया क्षीण नीला परिवेश है। चंद्र दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध है (केवल दिन-रात-चक्र वाली दुनियाएँ — [सूर्य और चंद्र](../internals/sun-and-moon.md))।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## संध्या की उष्णता (सूर्य की ऊँचाई से रंजन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // क्षितिज पर 1 / ठीक ऊपर 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## इंजन-निर्गम का पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // NOTE: BloxdLight(...) का सीधा निर्माण निषिद्ध है; default से बनाकर colour बदलें
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (इंजन प्रकाश परिणाम) त्यागकर "आधार रंग × स्वयं संगणित चमक" प्रयोग करें
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour त्यागा गया, इसलिए फ़ॉग दोबारा लगाना आवश्यक
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission भी स्वयं जोड़ें (आवश्यक)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
