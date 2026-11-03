# प्रकाश रेसिपी (light)



## कंट्रास्ट S वक्र

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## दूरी धुंध (स्वनिर्मित फ़ॉग)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ब्लॉक से 192 ब्लॉक पर 0..0.35 स्वनिर्मित फ़ॉग जोड़ना
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## रात (skyLight नीला झुकाव + दीया रक्षा)

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

## गुफा अंधेरा (skyLight-हीन और गाढ़ा)

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

> `skyLight` लिफ्ट बाद का मान है (अध्याय 10), हल्का अवरोध (पेड़ नीचे: कच्चा 0.87 → लिफ्ट बाद 0.97) इस विधि से लगभग गाढ़ा नहीं होता। गुफा (कच्चा 0) पर असर करता है। "वनछाया" स्पष्ट चाहिए तो R9.12 लिफ्ट व्युत्क्रम + देहली विधि प्रयोग करें।

## रात का नीला परिवेश (चंद्र दिशा बिना छद्म अभिव्यक्ति)

> इस API में सूर्यहीन आकाश का `bloxdSunDirection()` शून्य है। नीचे दिशात्मक चांदनी नहीं, मात्र अंधेरे आकाश में क्षीण नीला परिवेश। चंद्र दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](../internals/) R-A)।

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

## संध्या ताप (सूर्य ऊँचाई से रंग झुकाव)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // क्षितिज 1 / ठीक ऊपर 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## इंजन निर्गम पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) सीधा निर्माण निषिद्ध। default से बनाकर colour बदलें
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (इंजन प्रकाश परिणाम) त्यागकर 「सामग्री रंग × स्वयं संगणित चमक」 रखें
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour छोड़ा, अतः फ़ॉग पुनः लगाएँ (आवश्यक)
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission भी स्वयं जोड़ें (आवश्यक)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
