# लोडिंग त्रुटियाँ

> लक्ष्य API: 5 · स्थिति: Verified

**लोडर चरण** (पहला द्वार) पर अस्वीकृत होने वाली त्रुटियाँ, जो सेटिंग्स की स्थिति पंक्ति में `shaderPack:load*` ID के साथ दिखती हैं।

## "There's no pack.json at the top of the pack."

- **कारण**: zip के रूट पर `pack.json` नहीं है (जैसे फ़ोल्डर को एक अतिरिक्त नेस्टिंग स्तर के साथ ज़िप कर दिया गया)
- **जाँच**: zip खोलें — `pack.json` सबसे ऊपरी स्तर पर हो (या एक साझा रूट फ़ोल्डर के ठीक नीचे)
- **समाधान**: `pack.json` और `.wgsl` फ़ाइलों को सीधे ज़िप करें। एकमात्र साझा रूट फ़ोल्डर अपने आप हटा दिया जाता है ([पैक संरचना](../getting-started/pack-structure.md))
- **रोकथाम**: अपनी ज़िपिंग प्रक्रिया एक जैसी रखें; macOS का "Compress" जैसा है वैसा ही चलता है (OS का कचरा अपने आप बाहर रहता है)

## zip लोड पर `loadDuplicateManifest`

- **कारण**: दो `pack.json` फ़ाइलें (केस के अंतर वाली भी शामिल)
- **समाधान**: ठीक एक ही रखें

## आकार और संख्या सीमाएँ

| संदेश | सीमा |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | 1,024 प्रविष्टियाँ |
| `The pack has more than 256 .wgsl files.` | 256 `.wgsl` फ़ाइलें |
| `The pack's .wgsl files are over 256 KB in total.` | कुल 256 KB |
| `pack.json is over 64 KB.` | 64 KB मैनिफ़ेस्ट |

- **समाधान**: बेकार `.wgsl` फ़ाइलें हटाएँ / फ़ाइलें मिलाएँ / टिप्पणियाँ छाँटें
- **रोकथाम**: ये सीमाएँ व्यावहारिक कंपाइल-टाइम की ऊपरी बाध्य सीमाएँ भी हैं — बढ़ोतरी को रीफ़ैक्टरिंग का संकेत मानें

## फ़ॉर्मैट की समस्याएँ

स्प्लिट zip, zip64, एन्क्रिप्टेड प्रविष्टियाँ और असमर्थित कंप्रेशन — इनमें से हर एक को समर्पित संदेश के साथ अस्वीकार किया जाता है। सभी फ़ाइलें वैध UTF-8 होनी चाहिए।

## लोडर त्रुटि-ID संदर्भ

| ID | अर्थ |
|---|---|
| `loadZipTooBig` | zip 32MB से ऊपर |
| `loadTooManyZipEntries` | 1024 प्रविष्टियों से ऊपर |
| `loadTooManyWgsl` | 256 `.wgsl` से ऊपर |
| `loadSourceTooBig` | कुल 256KB से ऊपर (प्रति-फ़ाइल स्ट्रीमिंग जाँच) |
| `loadManifestTooBig` | `pack.json` 64KB से ऊपर |
| `loadManifestNotJson` / `loadManifestNotObject` | JSON नहीं / ऑब्जेक्ट नहीं |
| `loadNoApiVersion` / `loadWrongApiVersion` | गायब / `5` नहीं ([API संस्करण त्रुटियाँ](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` गायब / `author` स्ट्रिंग नहीं |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | असमर्थित कंप्रेशन / zip64 / स्प्लिट / एन्क्रिप्टेड |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | डुप्लिकेट पाथ / नॉन-UTF-8 / डीकंप्रेशन विफलता / ख़राब zip |
| `loadNoManifest` / `loadDuplicateManifest` | मैनिफ़ेस्ट की स्थिति / दोहराव |

## "Ready. Reload the page to use it." पर कुछ नहीं बदलता

- **कारण**: पैकों के सक्रिय होने के लिए **पेज रीलोड** चाहिए
- **समाधान**: चुनने के बाद रीलोड करें; स्थिति `Ready to use` हो जानी चाहिए
- **टिप्पणी**: पीछे छूटे रेंडरर ओवरराइड (`?renderer=`, localStorage `bloxdRenderer`) पैक को चालू होने से रोक देते हैं — इन्हें साफ़ करके रीलोड करें

## संबंधित

- [API संस्करण त्रुटियाँ](api-version.md) · [पैक संरचना](../getting-started/pack-structure.md) · [पैक फ़ॉर्मैट](../api/pack-format.md)
