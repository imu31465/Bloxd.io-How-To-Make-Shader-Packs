# वेरिएंट-विशिष्ट समस्याएँ

> लक्ष्य API: 5 · स्थिति: Verified

वे समस्याएँ जो 6 में से केवल कुछ वेरिएंट (`strict|allow` × `terrain|liquid|model`) में घटित होती हैं। v5 ने लाइटिंग अक्ष (पुराना `BLOXD_LIGHTING`) हटा दिया और लोडर लोड के समय **सभी 6 वेरिएंट एक साथ** सत्यापित करता है।

## केवल ग़ैर-strict गेमों में लोड होता है / strict में ड्रॉप

- **कारण**: बिना गार्ड का vertex हुक या पहुँच योग्य `discard`; strict गेम दोनों पर रोक लगाते हैं और उल्लंघन = **पूरे पैक का स्वतः निष्क्रिय होना** (`shaderPack:offInStrict`)
- **जाँच**: लोडर स्क्रीन पर `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.` दिखता है
- **समाधान**: vertex हुकों और `discard` को `#ifndef BLOXD_STRICT` में लपेटें
- **रोकथाम**: vertex हुक हमेशा गार्डेड टेम्पलेट से शुरू करें ([वेरिएंट](../getting-started/variants.md))

## ".alpha is undefined"

- **कारण**: `alpha` केवल `#ifdef BLOXD_ALPHA` के पीछे मौजूद है (सभी liquid + ग़ैर-strict terrain/model)
- **समाधान**: alpha छूने वाले कोड को `#ifdef BLOXD_ALPHA` में लपेटें ([प्रीप्रोसेसर](../api/preprocessor.md#मकर--वरएट-मटरकस))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **कारण**: strict वेरिएंट में vertex हुक होते ही नहीं, इसलिए `BloxdVertex` भी नहीं; vertex कोड strict वेरिएंट से पहुँच योग्य है
- **समाधान**: vertex हुक पर गार्ड लगाएँ

## bloxdOpaqueBehind केवल कुछ वेरिएंट में विफल होता है

- **कारण**: `BLOXD_SCENE_DEPTH` केवल सभी-liquid वेरिएंट में परिभाषित होता है
- **समाधान**: `#ifdef BLOXD_SCENE_DEPTH` ([सत्यापन त्रुटियाँ](validation.md))

## पानी पैक को नज़रअंदाज़ करता है (Liquid)

- **लक्षण**: terrain हुक लिखे हैं, पानी जैसा था वैसा ही है
- **कारण**: **v5 में, यदि पैक कोई Liquid हुक परिभाषित नहीं करता, तो पानी पर कोई Terrain हुक भी नहीं चलता** (pre-v4 का "liquid, terrain पर गिर जाता है" व्यवहार जा चुका है)
- **समाधान**: Liquid हुक लिखें ([हुक विभाजन](../api/hooks.md#हर-परगरम-कय-डर-करत-ह))

## मॉडल (एंटिटी, ब्लॉक मॉडल) अछूते

- **कारण**: v5 से पहले दायरे से बाहर; अब `bloxdModel*` हुक चाहिए
- **समाधान**: `bloxdModelSurface` / `bloxdModelLight` परिभाषित करें ([मॉडल गाइड](../guides/models.md))

## 6-वेरिएंट सत्यापन के बारे में

लोडर लोड पर **सभी 6 वेरिएंट एक साथ** सत्यापित करता है (लाइटिंग अक्ष अब अलग से कंपाइल नहीं होता)। भले ही कोई गेम केवल कुछ शर्तें उपयोग करता हो, वितरित पैकों को छहों की अपेक्षा रखनी चाहिए।

| वेरिएंट | परिभाषित मैक्रो |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## संबंधित

- [वेरिएंट](../getting-started/variants.md) · [प्रीप्रोसेसर](../api/preprocessor.md) · [नीति](../internals/policy.md)
