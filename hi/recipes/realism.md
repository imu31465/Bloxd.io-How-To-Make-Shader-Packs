# यथार्थवादी रेसिपी



> "वैनिला रूप सामग्री से पुनर्गठन" भौतिक रेसिपी संग्रह। आधार शर्तें:
>
> 1. **light हुक फ्रैगमेंट अंतिम चरण में बुलाया जाता है**। लौटाया colour ज्यों का त्यों अंतिम रंग। **स्वयं फ़ॉग दोबारा लगाना आवश्यक** (R9.10)  
> 2. **इंजन मूल प्रकाश केवल गुणन** है। स्पेक्युलर / फ्रेनेल / उष्ण-शीत पृथक्करण / अर्धगोल परिवेश शून्य से बनाएँ  
> 3. `l.engineColour` पूर्ण रंग (फ़ॉग लगा हुआ) है। त्यागकर `s.colour` (एल्बिडो) से पुनर्गठन ही प्रामाणिक मार्ग है  
> 4. टेक्सचर निषिद्ध → विवरण सब **प्रक्रियात्मक** (हैश/शोर) डालें (R9.8)

## R9.1 उष्ण मशाल × शीत आकाशप्रकाश

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // फ़ॉग पुनः लगाएँ
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission पुनः जोड़ें
}
    return out;
}
```

## R9.2 सूर्य स्पेक्युलर (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
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
}
    return out;
}
```

## R9.3 Schlick फ्रेनेल

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // किनारे की हल्की चमक
}
    return out;
}
```

## R9.4 अर्धगोल परिवेश (ऊपर=आकाश / नीचे=भूमि उछाल)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // नीचे: उछाल
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // फ़ॉग पुनः लगाएँ
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission पुनः जोड़ें
}
    return out;
}
```

## R9.5 ACES फ़िल्मिक (Narkowicz सन्निकटन)

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

## R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी से संतृप्ति गिरने की 「हवा भावना」)

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

## R9.7 तरंग अभिलंब + सूर्य चमक (जल पर 「सूर्य मार्ग」)

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
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 प्रक्रियात्मक सूक्ष्म उभार (टेक्सचर निषेध चकमा)

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
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // ब्लॉक भीतर स्थानीय निर्देशांक
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 गुफा अरैखिक अंधेरा + दीया रक्षा

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // दीये वाली जगह उठाएँ
        out.colour *= mix(keep, 1.0, sky * sky);     // अंधेरा अरैखिक (वर्ग)
}
    return out;
}
```

## R9.10 फ़ॉग पुनः लगाना (engineColour त्याग पर आवश्यक)

> `(1.0 - l.fogAlpha)` को `min(l.fogAlpha, 0.75)` निम्नसीमा सहित प्रयोग से "इससे सघन नहीं" समायोजन बनता है  
> (0.0 = इंजन अनुरूप / 0.3–0.5 = दूर स्पष्ट)।  
> ध्यान रहे इंजन फ़ॉग क्षितिज समर्पित linear फ़ॉग (आरेखन दूरी समीप ही) है, मध्य दूरी धुंध पैक पक्ष बनाएँ।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन मिलान अद्यतित): linear स्थिर / `fogStart` = आरेखन खंड दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद सेटिंग में 100–101 खंड व्यावहारिक अमान्य / डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // फ़ॉग पुनरुत्पादन (0.15=हल्की निम्नसीमा)
        col += s.emission * (1.0 - l.fogAlpha);            // emission भी फ़ॉग सहित
        out.colour = col;
}
    return out;
}
```

## R9.11 सिनेमा-ग्रेड (छाया शीत / हाइलाइट उष्ण / रात विसंतृप्त)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // सूर्य दिशा शून्य पर ही रात। संध्या सतत परिवर्तन अभिव्यक्त नहीं
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 प्रक्षेपण छाया —— लिफ्ट व्युत्क्रम + देहली कट (निर्णायक)

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
    if (bloxdLit()) {
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
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission भी न भूलें (फ़ॉग-युक्त में जोड़ें)
}
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल `shTh` ही निर्धारित** — `0.93`=त्रिज्या1.5 ऊपर / `0.87`=त्रिज्या2 / `0.80`=त्रिज्या3 / `0.67`=त्रिज्या5।  
> छाया किनारा कठोरता `shSoft` (0.02=कठोर / 0.08=कोमल)। छाया क्रोड अंधेरा `0.09` (न्यूनतम परिवेश) व `0.16` (आकाश प्रकीर्ण प्रकाश)  
> 2-बिंदु स्थानांतरण से तय होता है। संध्या में छाया फैलानी हो तो  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी संध्या छाया सन्निकटन।  
> `sunDir` यानी `bloxdSunDirection() / length(bloxdSunDirection())`)। छाया नीलापन हेतु `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।
