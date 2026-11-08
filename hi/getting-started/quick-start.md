# क्विक स्टार्ट

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (2026-11-08 को प्रोडक्शन और preprod में सत्यापित) · स्थिति: Verified

पाँच मिनट में आपका पहला पैक।

## 1. फ़ाइलें बनाएँ

`pack.json` और `pack.wgsl` के साथ एक फ़ोल्डर बनाएँ:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — एक न्यूनतम गर्म-रंगत (warm-tint) पैक:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> इंजन हेडर (कॉन्स्टैंट, स्ट्रक्चर, फ़ंक्शन) लोड के समय हर पैक के आगे अपने आप जुड़ जाता है — आप उसे कभी ख़ुद नहीं लिखते। पूरा हेडर [इंजन-आंतरिक](../internals/engine-header.md) में जैसा-का-तैसा दिया गया है।

## 2. गेम में लोड करें

1. सेटिंग्स → Shader Pack खोलकर zip या फ़ोल्डर लोड करें (फ़ोल्डर लोडिंग केवल डेस्कटॉप ब्राउज़र में)
2. स्थिति देखें: चुनते ही आपको "Ready. Reload the page to use it." दिखेगा — **पेज रीलोड के बाद** "Ready to use" का मतलब है कि सब कुछ सही है
3. "Saved, but it won't run until you fix these errors..." दिखे तो सूचीबद्ध त्रुटियाँ (file:line + variant) ठीक करके रीलोड करें

## 3. सत्यापित करें

1. पहले किसी allow गेम में टेस्ट करें
2. फिर किसी strict-मोड गेम में (ज़्यादातर गेम strict होते हैं)
3. vertex एनिमेशन केवल allow चिह्नित गेमों में चलता है

## 4. वितरित करें

zip बना दें — देखें [वितरण](distribution.md)।

## अटक गए?

- त्रुटियों का अर्थ → [ट्रबलशूटिंग](../troubleshooting/)
- हुक कैसे लिखें → [शेडर हुक](hooks.md)
- पूरा 9-हुक टेम्पलेट अगले पेज पर है — [शेडर हुक](hooks.md)
