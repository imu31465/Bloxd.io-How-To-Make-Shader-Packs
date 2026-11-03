# उत्सर्जन रेसिपी (emission)



> `emission` प्रकाश गणना बाद जुड़ता है, पर डिफ़ॉल्ट प्रक्रिया **`fogVisibility` से क्षीण करती है। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है। दूर भी चमकाने घटक emission में न जोड़ें, light हुक भीतर `out.colour += ...` सीधे जोड़ें** (engineColour फ़ॉग लगा हुआ अतः दूर धुंध वर्ण ऊपर प्रकाश चढ़ता है)

## दीया स्पंदन (मशाल श्वास)

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

## प्रदीप्त अयस्क भाव (उजली सामग्री चमके)

```wgsl
// surface पक्ष: सामग्री जितनी उजली (श्वेत) emission उतना चढ़ाएँ
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## जुगनू समूह भाव (काल से अंतरिक्ष तैरते प्रकाश बिंदु)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // कुछ 「प्रकाश गोल」 धीमे तैरते हैं। दूरी व्युत्क्रम से चमकाएँ
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```
