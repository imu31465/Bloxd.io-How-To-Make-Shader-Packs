[← पिछला भाग](02-api.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](04-realism.md)

# भाग III: रेसिपी संग्रह

- [R1. रंग रेसिपी (surface)](#r1-रंग-रेसिपी-surface)
- [R2. प्रकाश रेसिपी (light)](#r2-प्रकाश-रेसिपी-light)
- [R3. उत्सर्जन रेसिपी (emission)](#r3-उत्सर्जन-रेसिपी-emission)
- [R4. निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)](#r4-निर्देशांक-रेसिपी-विश्वब्लॉकदृष्टि)
- [R5. काल रेसिपी (एनिमेशन)](#r5-काल-रेसिपी-एनिमेशन)
- [R6. तरल रेसिपी](#r6-तरल-रेसिपी)
- [R7. वर्टेक्स रेसिपी (केवल allow)](#r7-वर्टेक्स-रेसिपी-केवल-allow)
- [R8. गणित छोटी युक्ति संग्रह](#r8-गणित-छोटी-युक्ति-संग्रह)
- [R9. यथार्थवादी रेसिपी](#r9-यथार्थवादी-रेसिपी)

---

सभी टुकड़े 8 वेरिएंट पास की शर्त वाली गार्ड सहित लिखे हैं, ज्यों का त्यों कॉपी कर स्थिरांक बदलने भर से प्रयोज्य हैं। पर नीचे रेसिपी अलग-अलग उदाहरण हैं, ऊपर से सब जोड़ने के काम की नहीं — एक ही हुक नाम (`bloxdTerrainLight` आदि) या एक ही सहायक फ़ंक्शन नाम कई चिपकाने से एक ही मॉड्यूल में परिभाषा दुहराकर कंपाइल विफल करता है। कई प्रभाव साथ प्रयोग करें तो हुकों को प्रकार अनुसार 1 में समेटकर उस फ़ंक्शन में एकीकृत करें।

## R1. रंग रेसिपी (surface)

### एकल रंगत (सबसे बुनियादी)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### संतृप्ति बढ़त / घटाव

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 से चमकीला / -1.0 पूर्ण मोनोक्रोम
```

### वर्ण तापमान (गर्म ⇄ ठंडा)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = गर्म (लाल प्रबल), -1.0 = ठंडा (नीला प्रबल)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### विंटेज / सेपिया

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### ऊँचाई प्रवणता (निचली भूमि गर्म)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // ऊँचाई 0..50 पर 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### फलक अभिविन्यास से रंगना (ऊपर=उजला, दीवार=गाढ़ा)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // फ़र्श 1 / दीवार 0 / छत -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // दीवार थोड़ी गाढ़ी, छत भी गाढ़ी
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### पोस्टराइज़ेशन (रंग संख्या घटाना)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. प्रकाश रेसिपी (light)

### कंट्रास्ट S वक्र

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### दूरी धुंध (स्वनिर्मित फ़ॉग)

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

### रात (skyLight नीला झुकाव + दीया रक्षा)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### गुफा अंधेरा (skyLight-हीन और गाढ़ा)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` लिफ्ट बाद का मान है (अध्याय 10), हल्का अवरोध (पेड़ नीचे: कच्चा 0.87 → लिफ्ट बाद 0.97) इस विधि से लगभग गाढ़ा नहीं होता। गुफा (कच्चा 0) पर असर करता है। "वनछाया" स्पष्ट चाहिए तो R9.12 लिफ्ट व्युत्क्रम + देहली विधि प्रयोग करें।

### रात का नीला परिवेश (चंद्र दिशा बिना छद्म अभिव्यक्ति)

> इस API में सूर्यहीन आकाश का `bloxdSunDirection()` शून्य है। नीचे दिशात्मक चांदनी नहीं, मात्र अंधेरे आकाश में क्षीण नीला परिवेश। चंद्र दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](07-internals.md) R-A)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### संध्या ताप (सूर्य ऊँचाई से रंग झुकाव)

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

### इंजन निर्गम पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) सीधा निर्माण निषिद्ध। default से बनाकर colour बदलें
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (इंजन प्रकाश परिणाम) त्यागकर 「सामग्री रंग × स्वयं संगणित चमक」 रखें
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour छोड़ा, अतः फ़ॉग पुनः लगाएँ (आवश्यक)
    out.colour = col + s.emission * l.fogVisibility;   // emission भी स्वयं जोड़ें (आवश्यक)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. उत्सर्जन रेसिपी (emission)

> `emission` प्रकाश गणना बाद जुड़ता है, पर डिफ़ॉल्ट प्रक्रिया **`fogVisibility` से क्षीण करती है। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है। दूर भी चमकाने घटक emission में न जोड़ें, light हुक भीतर `out.colour += ...` सीधे जोड़ें** (engineColour फ़ॉग लगा हुआ अतः दूर धुंध वर्ण ऊपर प्रकाश चढ़ता है)

### दीया स्पंदन (मशाल श्वास)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### प्रदीप्त अयस्क भाव (उजली सामग्री चमके)

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

### जुगनू समूह भाव (काल से अंतरिक्ष तैरते प्रकाश बिंदु)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // कुछ 「प्रकाश गोल」 धीमे तैरते हैं। दूरी व्युत्क्रम से चमकाएँ
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)

### विश्व निर्देशांक

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### ब्लॉक निर्देशांक (आधिकारिक रेसिपी — शीर्ष टिप्पणी उद्गम)

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### शतरंजी (ब्लॉक इकाई)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 या 1
out.colour *= mix(0.96, 1.04, checker);
```

### ब्लॉक इकाई छद्म यादृच्छिक (हैश)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// उपयोग: घास रंग भिन्नता, पत्थर रंग धब्बा आदि
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### दृष्टि सदिश व रिमप्रकाश

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### दृष्टि कोण (फ्रेनेल भाव — तरल हेतु)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // ठीक ऊपर से 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. काल रेसिपी (एनिमेशन)

> `bloxdTime()` हर 3600 सेकंड (1 घंटा) लपेटता है। शेडर बीता काल है, खेल के सूर्य·दिन-रात समन्वय की गारंटी नहीं। दिखावटी आवर्त एनिमेशन प्रयोज्य, वास्तविक रात निर्णय में `bloxdSunDirection()` व प्रकाश निवेश को प्राथमिकता दें।

### दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 एक घंटा आवर्त। खेल के दिन-रात समन्वय की गारंटी नहीं
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### डोलन (बहु sin अध्यारोपण)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### बहती पट्टी अरोरा / प्रतिदीप्त पट्टी

```wgsl
// XZ स्थिति व काल से 3 रंग मिलाएँ
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. तरल रेसिपी

### जलपृष्ठ लहर (रंग झिलमिल)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid सदा BLOXD_ALPHA — गार्ड आदतन
    #endif
    return out;
}
```

### ऊँचाई छद्म पारदर्शिता (सच्चा छिछला निर्णय नहीं)

> v1 में दृश्य गहराई व जलतल स्थिति संदर्भ असंभव था, अतः इस API भर से वास्तविक जल गहराई परिकलित नहीं हो सकती थी। v2 में तरल सीमित `bloxdOpaqueBehind()` से पीछे अपारदर्शी फलक तक मोटाई मापी जा सकती है ([भाग VIII](08-apiv2.md) R-E)। नीचे इसका प्रयोग न करने वाला पुराना छद्म प्रदर्शन है, `s.position.y` स्थानीय निर्देशांक, अतः ज्यों का त्यों प्रयोग से खंड मूल विचलन से प्रभाव हटता है। विश्व ऊँचाई प्रयोग करनी हो तो `bloxdWorldPosition()` से रूपांतरित करें। नीचे केवल विश्व ऊँचाई से alpha बदलने का छद्म प्रदर्शन, तटरेखा व जलतल अनुरूप छिछला अभिव्यक्ति नहीं। `packWaterReferenceY` विश्व ऊँचाई अनुरूप समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // निम्न ऊँचाई पतला, उच्च ऊँचाई मूल alpha निकट। खेल में दिशा जाँचें।
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### जलांदर से देखा जल धुंध

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### केवल-तरल पैक (टेरेन अक्षत रचना)

```wgsl
// terrain_* हुक बिल्कुल न लिखें। तब:
//  - terrain वेरिएंट = हुकहीन = टेरेन इंजन मूल ज्यों का त्यों
//  - liquid वेरिएंट  = केवल liquid_* हुक प्रभावी
```

## R7. वर्टेक्स रेसिपी (केवल allow)

> सब `#ifndef BLOXD_STRICT` से लपेटें।
> सटीक शर्तों (allow शीर्षक सूची; Custom Games strict है) के लिए §30 देखें: [§30 गेम-अनुसार अनुप्रयोग मोड](07-internals.md#30-गेम-अनुसार-अनुप्रयोग-मोड-shaderpackpolicy)

### घास पवन दोलन (शीर्ष ही हिलाएँ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // लंब फलक ही
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### द्रव पृष्ठ तरंग (शीर्ष फलक ही)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### स्पंदित टेरेन

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // अभिलंब दिशा में हल्का फैलाव-सिकुड़न
    return out;
}
#endif
```

### लहराता टेरेन (विशाल sin तरंग)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. गणित छोटी युक्ति संग्रह

```wgsl
// 0..1 मसृण श्रेणीकरण (n श्रेणी)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-स्तरीय देहली (टून छाया)
let shadow = smoothstep(0.35, 0.37, level);   // देहली ±0.02 से सीढ़ी बनती है

// 3-स्तरीय टून
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// लूमा (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// मसृण स्पंदन
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// त्रिभुज तरंग (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// सेकंड → "धीमी कला" रूपांतरण (3600 सेकंड लपेटन अनदेखा करने वाले इफ़ेक्ट हेतु)
let phase = t * 0.15;
```

## R9. यथार्थवादी रेसिपी

> "वैनिला रूप सामग्री से पुनर्गठन" भौतिक रेसिपी संग्रह। आधार शर्तें:
>
> 1. **light हुक फ्रैगमेंट अंतिम चरण में बुलाया जाता है**। लौटाया colour ज्यों का त्यों अंतिम रंग। **स्वयं फ़ॉग दोबारा लगाना आवश्यक** (R9.10)  
> 2. **इंजन मूल प्रकाश केवल गुणन** है। स्पेक्युलर / फ्रेनेल / उष्ण-शीत पृथक्करण / अर्धगोल परिवेश शून्य से बनाएँ  
> 3. `l.engineColour` पूर्ण रंग (फ़ॉग लगा हुआ) है। त्यागकर `s.colour` (एल्बिडो) से पुनर्गठन ही प्रामाणिक मार्ग है  
> 4. टेक्सचर निषिद्ध → विवरण सब **प्रक्रियात्मक** (हैश/शोर) डालें (R9.8)

### R9.1 उष्ण मशाल × शीत आकाशप्रकाश

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // फ़ॉग पुनः लगाएँ
    out.colour = col + s.emission * l.fogVisibility;                 // emission पुनः जोड़ें
    #endif
    return out;
}
```

### R9.2 सूर्य स्पेक्युलर (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // अर्ध सदिश
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick फ्रेनेल

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // किनारे की हल्की चमक
    #endif
    return out;
}
```

### R9.4 अर्धगोल परिवेश (ऊपर=आकाश / नीचे=भूमि उछाल)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // नीचे: उछाल
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // फ़ॉग पुनः लगाएँ
    out.colour = col + s.emission * l.fogVisibility;                        // emission पुनः जोड़ें
    #endif
    return out;
}
```

### R9.5 ACES फ़िल्मिक (Narkowicz सन्निकटन)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = अनावृति
    return out;
}
```

### R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी से संतृप्ति गिरने की 「हवा भावना」)

> ध्यान: धुंध वर्ण पर चमक बढ़ाने वाली प्रक्रिया (`normalize` आदि) लगाने से गाढ़े दृश्य में "चमकीली श्वेत धुंध" तैरती है,  
> और engineColour (फ़ॉग-युक्त) में फिर धुंध वर्ण जोड़ने से दोहरा फ़ॉग श्वेत कर देता है। **वायु भावना केवल संतृप्ति घटाकर** दिखाना सुरक्षित है।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // दूरी क्षय (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // संतृप्ति ही घटाएँ (चमक अपरिवर्तित)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 तरंग अभिलंब + सूर्य चमक (जल पर 「सूर्य मार्ग」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // ऊँचाई h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 प्रक्रियात्मक सूक्ष्म उभार (टेक्सचर निषेध चकमा)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // ब्लॉक भीतर स्थानीय निर्देशांक
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 गुफा अरैखिक अंधेरा + दीया रक्षा

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // दीये वाली जगह उठाएँ
    out.colour *= mix(keep, 1.0, sky * sky);     // अंधेरा अरैखिक (वर्ग)
    #endif
    return out;
}
```

### R9.10 फ़ॉग पुनः लगाना (engineColour त्याग पर आवश्यक)

> `l.fogVisibility` को `max(l.fogVisibility, 0.25)` निम्नसीमा सहित प्रयोग से "इससे सघन नहीं" समायोजन बनता है  
> (0.0 = इंजन अनुरूप / 0.3–0.5 = दूर स्पष्ट)।  
> ध्यान रहे इंजन फ़ॉग क्षितिज समर्पित linear फ़ॉग (आरेखन दूरी समीप ही) है, मध्य दूरी धुंध पैक पक्ष बनाएँ।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन मिलान अद्यतित): linear स्थिर / `fogStart` = आरेखन खंड दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद सेटिंग में 100–101 खंड व्यावहारिक अमान्य / डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // फ़ॉग पुनरुत्पादन (0.15=हल्की निम्नसीमा)
    col += s.emission * l.fogVisibility;            // emission भी फ़ॉग सहित
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 सिनेमा-ग्रेड (छाया शीत / हाइलाइट उष्ण / रात विसंतृप्त)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // सूर्य दिशा शून्य पर ही रात। संध्या सतत परिवर्तन अभिव्यक्त नहीं
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 प्रक्षेपण छाया —— लिफ्ट व्युत्क्रम + देहली कट (निर्णायक)

> **आधार पुनःपुष्टि (अध्याय 10)**: `l.skyLight` कच्चा voxel मान (n/15) नहीं, बल्कि इंजन "लिफ्ट वक्र"  
> `y = 1-(1-x/(3-2x))³` (अंधेरी जगह उठाने वाला S वक्र) पार करने के बाद का मान।
>
> | स्थान | voxel कच्चा | लिफ्ट बाद (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | खुला आकाश | 1.00 | 1.00 | 1.00 |  
> | पेड़ नीचे (त्रिज्या2) | 0.87 | **0.97** | **0.86** ← लगभग अक्षत |  
> | त्रिज्या3 | 0.80 | **0.92** | 0.66 |  
> | त्रिज्या5 | 0.67 | 0.78 | 0.29 |
>
> **यही "गामा उठाकर भी छाया सघन नहीं" का सिद्ध कारण** है (संख्यात्मक प्रमाण)। पर वक्र एकदिष्ट है अतः बीजीय कठोर व्युत्क्रमण संभव:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`। कच्चा मान पुनः प्राप्त कर, बाद **देहली कट** (`smoothstep`) से द्विमानीकरण मात्र।  
> LightEngine BFS पाश्व प्रसार "सन्निकट 1 ब्लॉक = -1" अतः देहली `th = 1 - r/15` सीधे  
> "r ब्लॉक व अधिक अवरोध छाया मानो" डायल बनता है। ब्लॉक तोड़ते ही छाया चलती है (LightEngine वास्तविक-समय पुनर्गणना)।  
> सीमा: छाया "ऊपरी आकाश" आधार अतः सूर्य गति से घूमती नहीं (अध्याय 15 "छाया का सत्य")।

```wgsl
// ★इंजन लिफ्ट कठोर व्युत्क्रमण, कच्चा voxel skyLight (n/15) पुनः प्राप्त
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL में cbrt नहीं अतः pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★छाया त्रिज्या डायल: th = 1 - r/15 (0.87→त्रिज्या2 व अधिक छाया)
const shSoft = 0.04;   // किनारा कोमलता (0.02=कठोर / 0.08=कोमल)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. कच्चा मान पुनः प्राप्त (छूटा तो कभी छाया नहीं)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. देहली कट — धूप=1 / छाया=0 निश्चयपूर्वक पृथक् करें
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // सूर्य Lambert (सूर्य न होने पर l.directional पर फॉलबैक)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★प्रक्षेपण सार: सूर्य सीधी धूप "आकाश दिखने वाली जगह" पर ही पहुँचती है
    let lit = sunL * sky;
    // छायापक्ष: काला नहीं, आकाश-रंजित + न्यून परिवेश
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // मशाल प्रकाश छाया भेदता है (blockLight भी लिफ्ट बाद अतः साथ पुनः प्राप्त)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // फ़ॉग पुनः लगाएँ (engineColour त्याग अंश)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission भी न भूलें (फ़ॉग-युक्त में जोड़ें)
    #endif
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल `shTh` ही निर्धारित** — `0.93`=त्रिज्या1.5 ऊपर / `0.87`=त्रिज्या2 / `0.80`=त्रिज्या3 / `0.67`=त्रिज्या5।  
> छाया किनारा कठोरता `shSoft` (0.02=कठोर / 0.08=कोमल)। छाया क्रोड अंधेरा `0.09` (न्यूनतम परिवेश) व `0.16` (आकाश प्रकीर्ण प्रकाश)  
> 2-बिंदु स्थानांतरण से तय होता है। संध्या में छाया फैलानी हो तो  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी संध्या छाया सन्निकटन।  
> `sunDir` यानी `bloxdSunDirection() / length(bloxdSunDirection())`)। छाया नीलापन हेतु `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।

[← पिछला भाग](02-api.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](04-realism.md)
