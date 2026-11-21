# API रेफ़रेंस

यह अनुभाग मौजूदा Shader Pack API v5 का विवरण देता है। प्रत्येक पृष्ठ shader pack बनाने और लागू करने के लिए आवश्यक प्रकारों, फ़ंक्शनों और सीमाओं को समझाता है।

## नक़्शा

| पेज | सामग्री |
|---|---|
| [पैक फ़ॉर्मैट](pack-format.md) | `pack.json` का हर फ़ील्ड, लोडर सीमाएँ, uniform लेआउट |
| [शेडर हुक](hooks.md) | 9-हुक तुलना: हस्ताक्षर, लक्ष्य, चलने की शर्तें |
| [फ़्लैग](flags.md) | `BloxdFlags` के सभी 14 फ़ील्ड |
| [स्ट्रक्चर](structures.md) | हर स्ट्रक्चर का हर फ़ील्ड (सशर्त फ़ील्ड सहित) |
| [फ़ंक्शन्स](functions.md) | सभी frame/default/special फ़ंक्शन हस्ताक्षर |
| [लाइटिंग](lighting.md) | लाइटिंग API और प्रोसेसिंग का क्रम |
| [टेक्सचर API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` और नामकरण |
| [कॉन्स्टैंट्स](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [प्रीप्रोसेसर](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [प्रतिबंध](restrictions.md) | भाषा की सीमाएँ, आरक्षित पहचानकर्ता |
| [कम्पैटिबिलिटी](compatibility.md) | पुराने-संस्करण के पैक, सेव-पैक का पुनः-सत्यापन |
| [टेक्सचर कैटलॉग](texture-catalog.md) | इस्तेमाल-योग्य सभी 1,017 नाम (खोजने-योग्य) |

v4 से माइग्रेट कर रहे हैं? देखें [संस्करण इतिहास: v5](../history/v5.md)।
