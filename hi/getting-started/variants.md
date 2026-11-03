# वेरिएंट और गार्ड

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03 को प्रोडक्शन में सत्यापित) · स्थिति: Analyzed

## 6 वेरिएंट

आप कोड की एक ही बॉडी लिखते हैं, पर उसे सभी **6 वेरिएंटों** में कंपाइल होना चाहिए: `{strict, allow} × {terrain, liquid, model}`। लोडर लोड के समय छहों का सत्यापन करता है।

v4 और उससे पहले का "लाइटिंग चालू/बंद" अक्ष जा चुका है (v4 में 8 वेरिएंट थे)। लाइटिंग की स्थिति अब [`bloxdLit()`](../api/lighting.md) के लिए रनटाइम का सवाल है, कंपाइल-टाइम की शाखा नहीं।

| वेरिएंट | उदाहरण | परिभाषित मैक्रो |
|---|---|---|
| `allow.terrain` | allow गेम में terrain | `BLOXD_ALPHA` |
| `allow.liquid` | allow गेम में पानी | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | allow गेम में मॉडल | `BLOXD_ALPHA` |
| `strict.terrain` | strict गेम में terrain | — |
| `strict.liquid` | strict गेम में पानी | `BLOXD_SCENE_DEPTH` |
| `strict.model` | strict गेम में मॉडल | — |

## सशर्त निर्देश

केवल `#define NAME` (बिना वैल्यू) / `#ifdef` / `#ifndef` / `#else` / `#endif` उपलब्ध हैं। `#` पंक्ति की शुरुआत में लगता है (फ़ंक्शन के भीतर भी चलता है)।

| गार्ड | अर्थ | सामान्य उपयोग |
|---|---|---|
| `#ifndef BLOXD_STRICT` | केवल ग़ैर-strict (allow) वेरिएंट | पूरे vertex हुक लपेटना, `discard` लपेटना |
| `#ifdef BLOXD_ALPHA` | वे वेरिएंट जहाँ `alpha` मौजूद है (सभी liquid + ग़ैर-strict terrain/model) | alpha छूने वाला कोड लपेटना |
| `#ifdef BLOXD_SCENE_DEPTH` | सभी liquid वेरिएंट | `bloxdOpaqueBehind()` कॉल लपेटना |

`BLOXD_LIGHTING` **v5 में हटा दिया गया है**। इस्तेमाल करने पर सत्यापन इस संदेश के साथ असफल होता है: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## strict गेमों का अनुबंध

ज़्यादातर गेम strict होते हैं (कोई vertex एनिमेशन नहीं, कोई `discard` नहीं)। बिना गार्ड का vertex हुक `<hook> moves terrain, which strict games prevent.` रिपोर्ट करता है, और पहुँच योग्य `discard` के लिए `discard makes terrain see-through, which strict games prevent.` आता है — दोनों ही उस strict गेम में **सभी हुक** बंद कर देते हैं। vertex हुक हमेशा `#ifndef BLOXD_STRICT` में लपेटें।

प्रति-गेम नीति की आंतरिक ब्यौरों के लिए देखें [इंजन-आंतरिक: नीति](../internals/policy.md)।
