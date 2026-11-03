# शेडर सत्यापन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` · स्थिति: Analyzed (लाइव वैलिडेटर से पुनर्स्थापित)

स्थैतिक सत्यापन (एनालाइज़र, लोड जाँच का चरण 1)। उपयोगकर्ता के लिए सुधार: [सत्यापन त्रुटियाँ](../troubleshooting/validation.md)।

## चरण

1. **लोडर सीमाएँ** (zip / pack.json का आकार) → [पैक फ़ॉर्मैट](../api/pack-format.md)
2. **स्थैतिक सत्यापन (एनालाइज़र)** — यह पृष्ठ; वाक्यरचना, प्रकार, आरक्षित नाम, सभी 6 वेरिएंटों में हुक अनुबंध
3. **ब्राउज़र में असली संकलन** → [WGSL कंपाइलेशन](wgsl-compilation.md)
4. **गेम-जॉइन पर रनटाइम पुनः-सत्यापन** — हर मौजूदा टेरेन सामग्री को वास्तव में संकलित करता है (सेटिंग्स-स्क्रीन जाँच से सख़्त); इसमें विफल होने पर पैक उस गेम के लिए हटा दिया जाता है

## स्पेशल-फ़ंक्शन हस्ताक्षर तालिका

वैलिडेटर मॉड्यूल 29849 में एक तालिका रखता है और हुकों के बीच कॉल-प्रतिबंध जाँचता है:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

बहाल तर्क:

- `vertex: true` न होने वाले स्पेशल फ़ंक्शन को vertex हुक से कॉल करना → *"X reaches Y, which only surface and light hooks can use."*
- किसी `symbol` वाले फ़ंक्शन (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) को उस मैक्रो को परिभाषित न करने वाले वेरिएंट से पहुँचाना → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

टिप्पणी: `bloxdFragmentBlockPosition` हेडर जनरेशन से गायब है, पर उसकी प्रविष्टि इस लाइव तालिका में बनी हुई है — और पहचानकर्ता जाँच इसी तालिका से पूछताछ करती है, इसलिए कॉल अब भी सत्यापन पास कर लेते हैं। कोड जनरेटर भी परिभाषा आज तक इंजेक्ट करता है (terrain/liquid और दोनों मॉडल प्रोग्राम), इसलिए फ़ंक्शन व्यवहार में कॉल-योग्य बना हुआ है। इसे अप्रचलित माना गया है: अप्रलेखित है, और किसी भी भविष्य संस्करण में हटाया जा सकता है।

## आरक्षित-नाम डायग्नोस्टिक्स

- **सामान्य नियम `/^bloxd/i`**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **सीधी texture/sampler घोषणाएँ**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## टेक्सचर-नाम रिज़ॉल्यूशन और डायग्नोस्टिक्स

`bloxdTextureId*` रिज़ॉल्यूशन का एक समर्पित पथ है ([संदेश](../api/texture-api.md#नम-रजलयशन-तरटय-वलडटर-स-अकषरश)):

- **फ़ोल्डिंग**: गैर-अल्फ़ान्यूमेरिक और CamelCase पर विभाजित करके `bloxdTextureId` उपसर्ग लगाना; रिवर्स मैचिंग केस/अंडरस्कोर-असंवेदनशील है
- **स्पेलिंग सुझाव** (v5 में नया): बिना मेल खाए नामों को देहली `max(2, floor(len/4)) + 1` पर Levenshtein प्रस्ताव मिलते हैं
- फ़्रेम स्पेलिंगों और टर्न्ड-प्रति स्पेलिंगों के लिए समर्पित संदेश
- फ़ोल्ड के बाद अस्पष्ट नाम अप्रयोग्य हैं

## v5 के नए डायग्नोस्टिक्स

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — हटाए गए मैक्रो का नाम बताता है
- `blockFlags` पढ़ने या `bloxdBlockFlag*` को संदर्भित करने वाले पैक आरक्षित-नाम डायग्नोस्टिक पर विफल हो जाते हैं — **कोई पैक चुपचाप ग़लत व्यवहार नहीं करता**

## Y-डिरिवेटिव रीराइट

एनालाइज़र का टोकन-रीराइट पास `dpdy` / `dpdyCoarse` / `dpdyFine` की हर कॉल को `(-dpdy(...))` के रूप में रीराइट कर देता है (dpdy परिवार को उलटाव-सेट के रूप में स्पष्ट रूप से गिना गया है)। `dpdx` और `fwidth` अछूते रहते हैं ([प्रतिबंध](../api/restrictions.md#सवचलत-ररइट))।

## हेडर और टेक्सचर-स्थिरांक जनरेशन

- हेडर रीड-ओनली रूप में आगे जोड़ा जाता है ([इंजन हेडर](engine-header.md))
- `bloxdTextureId*` ब्लॉक संदर्भित नामों से **प्रति पैक** जनरेट होता है

## HEADER_VERSION

`HEADER_VERSION` का रूप `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` है (अग्र पूर्णांक v4 से 8 → 9)। दोनों fnv1a32 प्रत्यय हेडर सामग्री और क्रमबद्ध नाम-id रजिस्ट्री की फ़िंगरप्रिंट बनाते हैं। सेव-किए-पैक का पुनः-सत्यापन यही फ़िंगरप्रिंट लेकर "needs re-check" का निर्णय करता है ([कम्पैटिबिलिटी](../api/compatibility.md#सवड-पक-क-पन-सतयपन-needs-re-check))।

## सत्यापन स्टब

स्थैतिक सत्यापन पास करने वाले कोड के लिए असली ब्राउज़र-WGSL जाँच से पहले स्टब कोड संश्लेषित किया जाता है: `var<private> bloxdValidationP: vec4f` सहित `bloxdValidateVertex` / `bloxdValidateFragment` — टाइप-स्टब तालिका (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) इनपुट स्ट्रक्चर बनाती है और हुकों को बुलाती है। विवरण: [WGSL कंपाइलेशन](wgsl-compilation.md)।

## संबंधित

- [सत्यापन त्रुटियाँ](../troubleshooting/validation.md) · [WGSL कंपाइलेशन](wgsl-compilation.md) · [टेक्सचर रजिस्ट्री](texture-registry.md) · [इंजन डेटा](engine-data.md)
