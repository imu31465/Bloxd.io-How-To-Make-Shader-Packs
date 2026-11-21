# इंजन डेटा

> लक्ष्य API: 5 · उद्देश्य: स्पेसिफ़िकेशन सारांश

यह पृष्ठ shader packs के लिए उपलब्ध API और pack बनाते समय लागू सीमाओं का सार देता है। परिभाषाओं और उदाहरणों के लिए संबंधित संदर्भ देखें।

## API का सार

| मद | स्पेसिफ़िकेशन |
|---|---|
| API संस्करण | `5` |
| हुक | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| वेरिएंट | 6 (allow / strict × terrain / liquid / model) |
| मैक्रो | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`। `BLOXD_LIGHTING` उपलब्ध नहीं है |
| Pack uniform | 80 bytes। फ़ील्ड offsets के लिए [Pack format](../api/pack-format.md) देखें |
| टेक्सचर | `bloxdTextureId<Name>` रूप वाले नामित constants उपयोग करें। संख्यात्मक ID को स्थायी न मानें |
| आरक्षित नाम | `bloxd` से शुरू होने वाले identifiers इंजन के लिए आरक्षित हैं |

## Pack सीमाएँ

| मद | सीमा |
|---|---:|
| WGSL फ़ाइलें | 256 |
| कुल WGSL source | 256 KB |
| `pack.json` | 64 KB |
| ZIP archive | 32 MB |
| ZIP entries | 1,024 |

ZIP की root में ठीक एक manifest रखें और फ़ाइलें UTF-8 में सहेजें। Duplicate paths और असमर्थित ZIP formats स्वीकार नहीं किए जाते। विवरण के लिए [Pack format](../api/pack-format.md) देखें।

## API v5 की मुख्य सुविधाएँ

- `bloxdShadow()` और `bloxdAirShadow(t)` सूर्य और चंद्रमा की रोशनी से बनने वाली छाया की जानकारी देते हैं।
- `bloxdShadowDirection()` छाया डालने वाली रोशनी की दिशा लौटाता है।
- Shadow API का उपयोग करते हुए पारंपरिक गोल छायाएँ बनाए रखने के लिए `pack.json` के वैकल्पिक `keepCircleShadows` फ़ील्ड को `true` करें।
- रोशनी की स्थिति runtime पर `bloxdLit()` से जाँचें; `BLOXD_LIGHTING` मैक्रो समर्थित नहीं है।

## संबंधित

- [API संदर्भ](../api/) — फ़ंक्शन, संरचनाएँ और constants
- [Pack format](../api/pack-format.md) — manifest, uniform और loader सीमाएँ
- [टेक्सचर कैटलॉग](../api/texture-catalog.md) — उपलब्ध टेक्सचर नाम
- [गेम-वार नीति](policy.md) — allow / strict दायरा
- [API v4 माइग्रेशन गाइड](../history/v4.md) — पिछले संस्करण से माइग्रेशन
