# टेक्सचर समस्याएँ

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bny9u` · स्थिति: Verified (संदेश लाइव वैलिडेटर से अक्षरशः दर्ज किए गए)

`bloxdTextureId*` / `bloxdTexel` के आसपास की समस्याएँ। सभी 896 नाम [टेक्सचर कैटलॉग](../api/texture-catalog.md) में खोजें।

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **कारण**: स्पेलिंग की ग़लती; वैलिडेटर में **Levenshtein सुझाव** हैं (देहली `max(2, floor(len/4)) + 1`)
- **समाधान**: सुझाव स्वीकार करें; [कैटलॉग](../api/texture-catalog.md) से मिलाकर देखें
- **रोकथाम**: नाम कैटलॉग से कॉपी-पेस्ट करें

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **कारण**: किसी एनिमेटेड टेक्सचर पर **फ़्रेम नंबर** लिखना (`lava0` आदि)
- **समाधान**: बेस नाम का उपयोग करें — सैंपलिंग मौजूदा फ़्रेम अपने आप लौटाती है
- **रोकथाम**: 42 एनीमेशन फ़ैमिलियों के लिए फ़्रेम सफ़िक्स कभी न लिखें ([नामकरण](../api/texture-api.md#स्पेलिंग-नियम-और-नामकरण-स्वतंत्रता))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **कारण**: किसी रोटेशन-फ़ैमिली की घुमाई-हुई-प्रति की स्पेलिंग लिखना (`[rot[N`)
- **समाधान**: रूट नाम का उपयोग करें — `bloxdTexel` रोटेशन दोबारा लगा देता है

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **कारण**: केस/अंडरस्कोर-असंवेदनशील फ़ोल्ड नाम को **अस्पष्ट** छोड़ देता है
- **समाधान**: स्पेलिंग स्पष्ट करें

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **कारण**: उपसर्ग की ग़लत स्पेलिंग (जैसे `bloxdTextureID`, `bloxdtextureid`)
- **समाधान**: नाम हमेशा ठीक `bloxdTextureId` से शुरू करें

## "Case and underscores are not distinguished" — दोनों नियम साथ कैसे चलते हैं?

नाम-रिज़ॉल्यूशन केस और `_` को मिला देता है, इसलिए `bloxdTextureId_grass_top` और `bloxdTextureIdGrassTop` **एक ही** कॉन्स्टैंट पर रिज़ॉल्व होते हैं। केवल जब फ़ोल्ड कई उम्मीदवार छोड़ दे, तभी समर्पित अस्पष्टता त्रुटि चलती है ([नामकरण नियम](../api/texture-api.md#स्पेलिंग-नियम-और-नामकरण-स्वतंत्रता))।

## bloxdTexel मॉडल पर हमेशा सफ़ेद लौटाता है

- **डिज़ाइन के अनुसार**: ज़्यादातर मॉडल `textureId: 0` (कोई टेक्सचर नहीं — प्लेयर स्किन आदि) उपयोग करते हैं; `bloxdTexel(0, ...)` `vec4f(1.0)` लौटाता है
- **समाधान**: `surface.textureId != 0u` से चुनें ([मॉडल-स्वामित्व टेक्सचर](../api/texture-api.md#मॉडल-स्वामित्व-टेक्सचर-textureid-0))

## टेक्सचर जोड़ना चाहना

- **सीमा**: शेडर-पैक API एटलस को केवल **पढ़ता** है; टेक्सचर जोड़ना टेक्सचर-पैक सिस्टम का काम है ([संयोजन](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **कारण**: `texture_*` / `sampler` टाइप सीधे घोषित करना
- **समाधान**: `bloxdTexel()` से होकर जाएँ ([प्रतिबंध](../api/restrictions.md))

## गेम अपडेट के बाद कच्चे id टूट गए

- **कारण**: **id स्नैपशॉट हैं** — मापा गया, दो बिल्डों के बीच बचे नामों 905 में से 334 का id बदल गया
- **समाधान**: `19` नहीं, `bloxdTextureIdLava` लिखें ([नाम ही API है](../api/texture-catalog.md#मापा-गया-ड्रिफ़्ट-cnty9--ab90qa))

## संबंधित

- [टेक्सचर API](../api/texture-api.md) · [टेक्सचर कैटलॉग](../api/texture-catalog.md) · [टेक्सचर रजिस्ट्री इंटर्नल्स](../internals/texture-registry.md)
