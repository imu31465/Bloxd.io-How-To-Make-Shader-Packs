# इंजन डेटा लेजर

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bbb6l5` (2026-11-20 को production और preprod में सत्यापित) · स्थिति: Verified

यह लेजर मौजूदा बिल्ड में shader packs के लिए उपलब्ध API के पुष्टि किए गए मानों को समेटता है। मॉड्यूल ID और chunk नंबर जैसे bundle के आंतरिक विवरण API विनिर्देश का हिस्सा नहीं हैं, इसलिए यहाँ शामिल नहीं किए गए हैं।

## मौजूदा विनिर्देश

| मद | मौजूदा मान |
|---|---|
| `apiVersion` | `5` (संख्या के साथ सख़्त तुलना) |
| इंजन हेडर | 216 पंक्तियाँ; पूरा पाठ [इंजन हेडर](engine-header.md) में |
| हुक | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| वेरिएंट | 6 (strict × terrain / liquid / model) |
| मैक्रो | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`; `BLOXD_LIGHTING` को v5 में हटाया गया |
| पैक uniform | 80 bytes: `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| पैक binding | `@group(3) @binding(0)`; `minBindingSize` 80 |
| फ़्लैग | 14 boolean फ़ील्ड वाला `BloxdFlags` स्ट्रक्चर |
| टेक्सचर एटलस | 1,650 लेयर; 1,017 नाम; 776 उपनाम |
| टेक्सचर परिवार | 64 रोटेशन और 71 एनीमेशन परिवार |
| आरक्षित पहचानकर्ता | `/^bloxd/i` से मेल खाते नाम और 88 आंतरिक `bloxdSp*` प्रतीक |
| गेम परिभाषाएँ | 119 |
| shader-pack नीति | 12 अनुमत शीर्षक, 28 प्रविष्टियाँ; [गेम-वार नीति](policy.md) देखें |
| डिफ़ॉल्ट पैक टेम्पलेट | 1,633 bytes |
| लोडर सीमाएँ | 256 WGSL फ़ाइलें / कुल 256 KB स्रोत / `pack.json` 64 KB / ZIP 32 MB / 1,024 प्रविष्टियाँ |

## bbb6l5 में बदलाव

`bbb6l5` में `apiVersion: 5` वही रहता है, लेकिन packs को दिखाई देने वाला API बढ़ता है:

- `bloxdShadow()`, `bloxdAirShadow(t)` और `bloxdShadowDirection()` इंजन द्वारा गणना की गई सूर्य और चंद्रमा की छाया उपलब्ध कराते हैं।
- uniform में offset 64 पर `shadowDirection: vec3f` जोड़ा गया; आकार 64 से 80 bytes हुआ।
- `pack.json` में पुरानी गोल छायाएँ बनाए रखने के लिए वैकल्पिक boolean फ़ील्ड `keepCircleShadows` जोड़ा गया।
- एटलस 1,227 से 1,650 लेयर और उपलब्ध नाम 906 से 1,017 हुए।
- `v98qt8` में आई टेक्सचर-स्थिरांक फ़ोल्डिंग प्रतिगमन ठीक की गई।

मापन का विवरण और प्रमाण [रिसर्च लॉग](research-log.md) तथा [टेक्सचर रजिस्ट्री का आंतरिक विवरण](texture-registry.md) में हैं।

## पुराने संस्करण

- [संस्करण इतिहास](../history/) — पुराने API के बदलाव और माइग्रेशन
- [रिसर्च लॉग](research-log.md) — मापन विधि और स्रोत

## संबंधित

- [इंजन हेडर](engine-header.md) — पूरा हेडर पाठ
- [गेम-वार नीति](policy.md) — allow / strict नीति वाले गेम
- [टेक्सचर रजिस्ट्री](texture-registry.md) — नाम और ID का मिलान
