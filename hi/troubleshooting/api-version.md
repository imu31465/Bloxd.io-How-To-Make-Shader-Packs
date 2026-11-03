# API संस्करण त्रुटियाँ

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03 को प्रोडक्शन में सत्यापित) · स्थिति: Verified (लाइव i18n डिक्शनरी से अक्षरशः)

`apiVersion` के आसपास की त्रुटियाँ। मौजूदा गेम **केवल `5`** स्वीकार करता है।

## "pack.json needs "apiVersion": {{version}}."

- **लक्षण**: लोड के तुरंत बाद यही संदेश (`loadNoApiVersion`)
- **कारण**: `apiVersion` कुंजी पूरी तरह गायब है
- **समाधान**: `"apiVersion": 5` जोड़ें — एक **संख्या** (स्ट्रिंग `"5"` विफल होती है)
- **रोकथाम**: [pack.json](../getting-started/manifest.md) टेम्पलेट से शुरू करें

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **लक्षण**: `loadWrongApiVersion`
- **कारण**: `apiVersion` मौजूद है पर 5 नहीं है (कोई v1–v4 पैक)
- **समाधान**: मिलता-जुलता माइग्रेशन लागू करें ([संस्करण इतिहास](../history/)):
  - v4 → v5: [v5 गाइड](../history/v5.md) — ज़्यादातर यांत्रिक (flags · `bloxdLit()` · `bloxdFragmentBlockPosition` की चेतावनी)
  - v3 → v5: पहले [v4](../history/v4.md) लागू करें
  - v2 या उससे पुराना → v5: v3 → v4 → v5 क्रम से गुज़रें
- **रोकथाम**: किसी भी API अपडेट के बाद [कम्पैटिबिलिटी](../api/compatibility.md) और मिलता-जुलता माइग्रेशन गाइड देखें

## स्ट्रिंग "5" अस्वीकृत होती है

- **कारण**: लोडर `manifest.apiVersion !== 5` की तुलना **सख़्ती से** (`===`) करता है; JSON स्ट्रिंग `"5"` संख्या 5 नहीं होती
- **समाधान**: `"apiVersion": 5` (बिना कोट्स)

## सहेजा गया पुराना पैक चुपचाप काम करना बंद कर देता है

- **लक्षण**: पहले ठीक चलता हुआ v1–v4 पैक बिना किसी अपवाद के निष्क्रिय पड़ा रहता है
- **कारण**: सहेजे गए पैक `{kind: "none", reason: "otherApiVersion"}` पर रिज़ॉल्व होकर **मौन रूप से निष्क्रिय** हो जाते हैं
- **जाँच**: सेटिंग्स-टैब की स्थिति पंक्ति: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **समाधान**: उसी स्क्रीन से माइग्रेट किया हुआ विकल्प लोड करें
- **रोकथाम**: API अपडेट के बाद बढ़ा हुआ संस्करण दोबारा जारी करें और घोषणा करें ([वितरण](../getting-started/distribution.md))

## माइग्रेट किया हुआ v4 पैक सत्यापन में विफल होता है

तीन आम पैटर्न (पूरे चरण [v5 माइग्रेशन गाइड](../history/v5.md) में):

| सत्यापन संदेश | कारण | समाधान |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` का उपयोग | इस रूप में दोबारा लिखें: `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (आरक्षित-नाम निदान) | छूटे हुए बिट-कॉन्स्टैंट संदर्भ | `surface.flags.rock` आदि का उपयोग करें ([फ़्लैग](../api/flags.md) में 1:1 तालिका) |
| `bloxdFragmentBlockPosition` गायब | v5 से डॉक्यूमेंटेड हेडर से बाहर (फिर भी इंजेक्ट और स्वीकृत — देखें [फ़ंक्शन](../api/functions.md)) | ठीक करने योग्य त्रुटि नहीं: यह कंपाइल होता है; नए कोड में `flags` / `bloxdWorldPosition()` को प्राथमिकता दें |

## संबंधित

- [कम्पैटिबिलिटी](../api/compatibility.md) · [संस्करण इतिहास](../history/) · [pack.json](../getting-started/manifest.md)
