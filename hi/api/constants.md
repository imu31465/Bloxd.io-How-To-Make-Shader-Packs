# स्थिरांक

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` · स्थिति: Analyzed (लाइव हेडर से अक्षरशः पुनर्स्थापित)

हेडर तीन स्थिरांक देता है (टेक्सचर-नाम स्थिरांक `bloxdTextureId*` [टेक्सचर API](texture-api.md) में कवर किए गए हैं)।

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| स्थिरांक | टाइप | मान | विवरण |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (आवर्तों के लिए सुविधाजनक) |
| `bloxdChunkSize` | `i32` | 32 | चंक की हर भुजा के अनुदिश ब्लॉकों की संख्या |

## उपयोग

### bloxdPi / bloxdTau

आपके लिए पहले से घोषित — अपना pi खुद परिभाषित करने की ज़रूरत नहीं। `bloxdTau` आवर्ती एनीमेशन के लिए सुविधाजनक है:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

चंक की हर भुजा के अनुदिश ब्लॉकों की संख्या, एक नाम वाले स्थिरांक के रूप में जिस पर आप ब्रांच कर सकते हैं। चंक-आवर्ती प्रभावों के लिए उपयोगी (चेकरबोर्ड, चंक-बॉर्डर एक्सेंट):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

टिप्पणी: `bloxdChunkSize` `i32` है — फ़्लोट के साथ मिलाते समय `f32(bloxdChunkSize)` से कास्ट करें।

## संबंधित

- [फ़ंक्शन](functions.md) · [वर्शन हिस्ट्री: v3](../history/v3.md) (जहाँ `bloxdPi` / `bloxdTau` आए थे)
