# उत्सर्जन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
> `emission` प्रकाश गणना के बाद जोड़ा जाता है, पर डिफ़ॉल्ट प्रक्रिया **इसे फ़ॉग मात्रा (`fogAlpha`) से क्षीण कर देती है। पूरी तरह फ़ॉग-युक्त दूरी में उत्सर्जन भी गायब हो जाता है। दूर तक चमकते रहना हो तो emission में न जोड़ें — लाइट हुक के भीतर सीधे `out.colour += ...` करें** (डिफ़ॉल्ट निर्गम पहले से फ़ॉग-युक्त है, इसलिए दूरी पर प्रकाश फ़ॉग रंग के ऊपर बैठता है)

## स्पंदित दीये (साँस लेती मशालें)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

## चमकते-अयस्क रूप (उजली सामग्री उत्सर्जित करती हैं)

```wgsl
// surface पक्ष: सामग्री जितनी उजली (सफ़ेद), उतना अधिक emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## जुगनू-झुंड रूप (समय के साथ तैरते प्रकाश बिंदु)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // कुछ "प्रकाश गोले" धीरे-धीरे तैरते हैं; दूरी के व्युत्क्रम से चमक
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```
