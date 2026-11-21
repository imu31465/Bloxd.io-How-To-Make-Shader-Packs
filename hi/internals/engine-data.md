# इंजन डेटा सारांश

> लक्ष्य API: 5 · स्थिति: Analyzed

यह पृष्ठ shader packs के लिए उपलब्ध API का सारांश देता है। उपयोग के विवरण के लिए [API रेफ़रेंस](../api/) देखें।

## API का दायरा

| मद | विनिर्देश |
|---|---|
| API संस्करण | `5` |
| इंजन हेडर | 216 पंक्तियाँ; [इंजन हेडर](engine-header.md) देखें |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variants | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Pack uniform | 80 bytes; [Pack format](../api/pack-format.md) देखें |
| Uniform fields | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Texture names | उपयोग योग्य named constants [texture catalog](../api/texture-catalog.md) में हैं |

## Shadow API

- `bloxdShadow()` इंजन द्वारा गणना किया गया सूर्य/चंद्रमा छाया गुणांक लौटाता है।
- `bloxdAirShadow(t)` कैमरा और fragment के बीच किसी बिंदु पर छाया का मूल्यांकन करता है।
- `bloxdShadowDirection()` छाया बनाने वाले प्रकाश की दिशा लौटाता है।
- `keepCircleShadows` `pack.json` का वैकल्पिक फ़ील्ड है, जो पुराने गोलाकार shadows को बनाए रखता है।

## संबंधित पृष्ठ

- [API रेफ़रेंस](../api/) — packs के लिए उपलब्ध API
- [Pack format](../api/pack-format.md) — manifest, uniform और loader limits
- [गेम नीति](policy.md) — प्रति-गेम प्रतिबंध
