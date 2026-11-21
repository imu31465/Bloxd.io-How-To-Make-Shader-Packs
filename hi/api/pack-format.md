# Pack format

> लक्ष्य API: 5 · प्रकार: API संदर्भ

इस पृष्ठ में manifest, ZIP archive सीमाएँ और pack uniform का सार दिया गया है। सेटअप के निर्देशों के लिए [शुरुआत](../getting-started/manifest.md) देखें।

## pack.json

`pack.json` को ZIP archive के root में रखें। यह JSON object होना चाहिए।

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| फ़ील्ड | प्रकार | आवश्यक | विवरण |
|---|---|---|---|
| `apiVersion` | number | हाँ | संख्यात्मक मान `5` सेट करें। String स्वीकार नहीं है |
| `name` | string | हाँ | आगे-पीछे के whitespace हटाने के बाद non-empty नाम |
| `author` | string | नहीं | लेखक का नाम |
| `keepCircleShadows` | boolean | नहीं | Shadow API का उपयोग करते हुए पारंपरिक गोल छायाएँ बनाए रखने के लिए `true` करें |

## Loader सीमाएँ

| मद | सीमा |
|---|---:|
| प्रति pack `.wgsl` फ़ाइलें | 256 |
| कुल `.wgsl` source | 256 KB |
| `pack.json` | 64 KB |
| ZIP archive | 32 MB |
| ZIP entries | 1,024 |

Split ZIP archives, Zip64, encrypted entries और unsupported compression methods समर्थित नहीं हैं। सभी फ़ाइलें UTF-8 में सहेजें और archive में duplicate paths न रखें।

## Pack uniform

Pack uniform 80 bytes का है और `@group(3) @binding(0)` पर bind होता है।

| Offset | Field | Type |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

Uniform का न्यूनतम binding size 80 bytes है। Group 3 के अन्य bindings Liquid variants के लिए scene-depth texture और `bloxdSpTextureLayers` storage buffer हैं।

## संबंधित

- [Manifest बनाना](../getting-started/manifest.md)
- [API संदर्भ](./)
- [API v5 माइग्रेशन गाइड](../history/v5.md)
