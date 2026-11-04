# यथार्थवाद

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
> "वैनिला के रूप को सामग्री से दोबारा बनाने" की भौतिक रेसिपियाँ। पहले ये प्राकल्पनाएँ पढ़ें:
>
> 1. **लाइट हुक अंतिम फ्रैगमेंट चरण पर बुलाया जाता है**। इसका लौटाया colour वैसा ही अंतिम रंग बन जाता है। **फ़ॉग आपको स्वयं दोबारा लगाना ही होगा** (R9.10)  
> 2. **इंजन का डिफ़ॉल्ट प्रकाश केवल गुणन है**। स्पेक्युलर / फ्रेनेल / उष्ण-शीत पृथक्करण / अर्धगोल परिवेश सभी शून्य से बनाए जा सकते हैं  
> 3. `l.engineColour` पूर्ण रंग (पहले से फ़ॉग-युक्त) है। `s.colour` (एल्बिडो) से पुनर्निर्माण ही पूर्ण-स्तरीय दृष्टिकोण है  
> 4. टेक्सचर निषिद्ध हैं → सारा विवरण **प्रक्रियात्मक** (हैश/शोर) होना चाहिए (R9.8)

## R9.1 उष्ण मशालें × शीत आकाशप्रकाश

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // फ़ॉग दोबारा
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission पुनः योग
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

## R9.4 अर्धगोल परिवेश (ऊपर आकाश / नीचे भूमि प्रतिक्षेप)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // नीचे: प्रतिक्षेप
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // फ़ॉग दोबारा
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission पुनः योग
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
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = एक्सपोज़र
    return out;
}
```

## R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी-विसंतृप्ति से "वायुरूप")

> फ़ॉग (रंग प्रतिस्थापन) के विपरीत, "दूरी से विसंतृप्ति" की परत चढ़ाने से दूर के दृश्य कहीं अधिक यथार्थवादी बनते हैं।  
> सावधानी: केवल संतृप्ति घटाएँ — चमक को कभी न छुएँ।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // पतन (~100blk पर ~30% / ~400blk पर ~75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // केवल संतृप्ति घटाएँ (चमक अपरिवर्तित)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

## R9.7 तरंग अभिलंब + सूर्य चमक (जल पर "सूर्य-पथ")

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // ऊँचाई h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
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

## R9.8 प्रक्रियात्मक सूक्ष्म-उभार (टेक्सचर-प्रतिबंध का विकल्प)

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
        let local = fract(l.position - l.normal * 0.5);   // ब्लॉक-भीतर स्थानीय निर्देशांक
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

## R9.9 अरैखिक गुफ़ा-अंधेरा + दीया रक्षा

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // दीये-प्रकाशित स्थान उठाएँ
        out.colour *= mix(keep, 1.0, sky * sky);     // अरैखिक (वर्ग) अंधेरा
}
    return out;
}
```

## R9.10 फ़ॉग दोबारा लगाना (engineColour त्यागने पर आवश्यक)

> `min(l.fogAlpha, 0.75)` जैसी निम्नसीमा लगाने से "इससे सघन नहीं" की टोपी बैठती है
> (0.0 = इंजन-अनुरूप / 0.3–0.5 = साफ़ दूरी)।
> ध्यान दें: इंजन फ़ॉग केवल-क्षितिज linear फ़ॉग है (केवल आरेखन दूरी के समीप); मध्य-दूरी की धुंध पैक-पक्ष बनानी होगी।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन-सत्यापित): linear स्थिर / `fogStart` = खंड आरेखन दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद होने पर 100–101 खंड पर व्यावहारिक रूप से निष्क्रिय / डिफ़ॉल्ट रंग RGB(183, 191, 195)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // फ़ॉग दोबारा (0.15 = हल्की निम्नसीमा)
        col += s.emission * (1.0 - l.fogAlpha);            // emission भी फ़ॉग-युक्त
        out.colour = col;
}
    return out;
}
```

## R9.11 सिनेमा-ग्रेड (शीत छायाएँ / उष्ण हाइलाइट / रात विसंतृप्ति)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // रात केवल तब जब सूर्य दिशा शून्य हो; संध्या प्रवणता नहीं
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 प्रक्षेपित छायाएँ — लिफ्ट व्युत्क्रम + देहली कट (निर्णायक)

> **प्राकल्पना पुनः जाँच (अध्याय 10)**: `l.skyLight` कच्चा वॉक्सेल मान (n/15) नहीं, बल्कि इंजन के "लिफ्ट वक्र"  
> `y = 1-(1-x/(3-2x))³` (अंधेरे क्षेत्रों को उठाने वाला S-वक्र) के बाद का मान है।
>
> | स्थान | कच्चा वॉक्सेल | लिफ्ट किया (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | खुला आकाश | 1.00 | 1.00 | 1.00 |  
> | पेड़ के नीचे (त्रिज्या 2) | 0.87 | **0.97** | **0.86** ← लगभग अछुता |  
> | त्रिज्या 3 | 0.80 | **0.92** | 0.66 |  
> | त्रिज्या 5 | 0.67 | 0.78 | 0.29 |
>
> **यही "गामा कितना भी बढ़ाएँ, छायाएँ गहरी नहीं होतीं" का सिद्ध मूल कारण है**। पर वक्र एकदिष्ट है, इसलिए इसे बीजीय रूप से व्युत्क्रमित किया जा सकता है:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`। कच्चे मान बहाल करने के बाद, बस देहली कट (`smoothstep`) से द्विमानीकृत करें।  
> LightEngine का BFS पार्श्व प्रसार "1 ब्लॉक = -1" है, इसलिए देहली `th = 1 - r/15` सीधे  
> "त्रिज्या r या अधिक का अवरोध छाया मानो" — यह डायल घुमाती है। ब्लॉक तोड़ते ही छायाएँ तुरंत हिल जाती हैं (LightEngine वास्तविक समय में पुनर्गणना करता है)।  
> सीमा: छायाएँ "ऊपरी आकाश" आधारित हैं, इसलिए सूर्य के साथ नहीं घूमतीं (अध्याय 15, "छाया का सत्य")।

```wgsl
// इंजन लिफ्ट को ठीक-ठीक व्युत्क्रमित करके कच्चा वॉक्सेल skyLight (n/15) बहाल करें
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL में cbrt नहीं है, pow प्रयोग करें
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // छाया त्रिज्या डायल: th = 1 - r/15 (0.87 = त्रिज्या 2+ छाया है)
const shSoft = 0.04;   // किनारे की नरमी (0.02 = कठोर / 0.08 = नरम)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. कच्चे मान बहाल करें (इसे छोड़ने से छायाएँ कभी नहीं बनतीं)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. देहली कट — धूप=1 / छाया=0 को साफ़ अलग करता है
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // सूर्य Lambert (सूर्य न होने पर l.directional पर फ़ॉलबैक)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // प्रक्षेपण का सार: सीधी धूप केवल आकाश दिखने वाली जगह तक पहुँचती है
        let lit = sunL * sky;
        // छाया पक्ष: काला नहीं, आकाश-नीला रंजित + न्यूनतम परिवेश
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // मशाल प्रकाश छाया भेदता है (blockLight भी लिफ्ट-युक्त है, साथ बहाल करें)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // फ़ॉग दोबारा लगाएँ (त्यागे गए engineColour का हिस्सा)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission मत भूलें (फ़ॉग-युक्त)
}
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल केवल `shTh` से तय होता है** — `0.93` = त्रिज्या 1.5+ / `0.87` = त्रिज्या 2 / `0.80` = त्रिज्या 3 / `0.67` = त्रिज्या 5।  
> किनारे की कठोरता `shSoft` (0.02 = कठोर / 0.08 = नरम) है। छाया-क्रोड का अंधेरा `0.09` (न्यूनतम परिवेश) और `0.16` (आकाश प्रकीर्णन) के दो-बिंदु स्थानांतरण से तय होता है।  
> संध्या में छायाएँ फैलानी हों तो `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी-संध्या-छाया सन्निकटन।  
> `sunDir` यानी `bloxdSunDirection() / length(bloxdSunDirection())`)। ज़्यादा नीली छायाओं के लिए `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।
>
