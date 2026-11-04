# pack.json (मैनिफ़ेस्ट)

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04 को प्रोडक्शन में सत्यापित) · स्थिति: Verified

`pack.json` पैक का मैनिफ़ेस्ट है — zip के रूट में ठीक एक JSON ऑब्जेक्ट।

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## फ़ील्ड

| फ़ील्ड | प्रकार | आवश्यक | विवरण |
|---|---|---|---|
| `apiVersion` | number | आवश्यक | **ठीक `5` के बराबर** होना चाहिए (strict `===`)। स्ट्रिंग `"5"` या कोई और प्रकार असफल होता है, और रिपोर्ट में उसकी JSON वर्तनी साथ आती है |
| `name` | string | आवश्यक | ट्रिम करने के बाद ग़ैर-खाली। सेटिंग्स UI में दिखता है |
| `author` | string | वैकल्पिक | छोड़ा जा सकता है; मौजूद हो तो स्ट्रिंग होना चाहिए |

बाकी सभी फ़ील्ड लोडर नज़रअंदाज़ कर देता है।

## संस्करण बेमेल होने पर क्या होता है

लोडर `manifest.apiVersion !== 5` की कड़ी तुलना करता है और **लोड होते ही असफल** हो जाता है। संदेश, लाइव i18n डिक्शनरी से शब्दशः:

- `pack.json needs "apiVersion": {{version}}.` — कुंजी पूरी तरह ग़ायब है
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — कुंजी मौजूद है पर 5 नहीं है

पहले से सेव किए गए पुराने पैक एक्सेप्शन नहीं फेंकते; वे `{kind: "none", reason: "otherApiVersion"}` में निपट जाते हैं और **चुपचाप निष्क्रिय** हो जाते हैं। शेडर-पैक सेटिंग्स टैब कारण बताता है:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

v1–v4 से माइग्रेट करने के लिए देखें [संस्करण इतिहास](../history/)।
