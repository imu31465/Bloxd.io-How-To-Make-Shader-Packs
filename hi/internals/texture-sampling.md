# टेक्सचर सैंपलिंग इंटर्नल्स

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` · स्थिति: Analyzed (लाइव जेनरेटर से बहाल, c56)

`bloxdTexel` / `bloxdTextureSize` असल में कैसे कंपाइल होते हैं — 3-वेरिएंट टेक्सचर कोडजेन। उपयोगकर्ता-पक्ष: [टेक्सचर API](../api/texture-api.md)।

## तीन वेरिएंट

### वेरिएंट 1 — टेक्सचर पैक निष्क्रिय (स्टब)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

असली एटलस के लिए लिखा गया कोड यहाँ भी कंपाइल और चल जाता है — बस उसे सफ़ेद टेक्सल और 1×1 आकार दिखते हैं।

### वेरिएंट 2 — एटलस पथ (गेम का डिफ़ॉल्ट)

`bloxdTextureSize`, `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))` लौटाता है। `bloxdTexel` लोड से पहले फ़ेस का चौथाई-घूमाव लगाता है — घूर्णन-जाल जेनरेटेड `bloxdSpTurned` if-श्रृंखला के रूप में लिखा जाता है:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` इनपुट फ़ील्ड `textureRotation` का इंजन-पक्ष भंडारण है।)

### वेरिएंट 3 — कस्टम टेक्सचर-पैक टेक्सचर

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` लेयर्ड एटलस की प्रति-टेक्सचर सेल सैंपल करता है; पैक के अपने टेक्सल `bloxdSpOwnTexel` पथ से जाते हैं।

## एनीमेशन फ़्रेम सीढ़ी

एनिमेटेड टेक्सचर (42 फ़ैमिलियाँ) प्रति-फ़ैमिली तय अंतरालों पर बढ़ते हैं (200 / 250 / 300 ms — [टेक्सचर कैटलॉग](../api/texture-catalog.md#एनमशन-परवर-42-नम) का अंतराल कॉलम)। `bloxdTexel` को कोई एनीमेशन-फ़ैमिली id देने पर मौजूदा फ़्रेम सैंपल होता है।

## सैंपलर सेटिंग

ब्लॉक टेक्सचर एक `texture_2d_array` हैं; terrain सैंपलर nearest + repeat है।

## Greedy meshing और UV

मेशर सामग्री/AO/प्रकाश मिलाने वाले फ़ेसों को एक आयतों में मिला देता है (**greedy meshing**), इसलिए मिले फ़ेसों पर vertex UV टाइल-चौड़ाई पार कर सकते हैं (किनारों पर 0.0015 इनसेट)। हार्डवेयर रिपीट एड्रेसिंग टाइलिंग सँभालता है, इसलिए मिले फ़ेस बेसीम दिखते हैं — पर `uv` से बँधा प्रोसीज़रल विवरण मर्ज-सीमाओं पर असंतत हो सकता है; दुनिया-निर्भर प्रभावों को `bloxdWorldPosition(position)` से बाँधें।

## संबंधित

- [टेक्सचर API](../api/texture-api.md) · [टेक्सचर रजिस्ट्री](texture-registry.md) · [रेंडरिंग पाइपलाइन](rendering-pipeline.md)
