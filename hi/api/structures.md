# इनपुट व आउटपुट स्ट्रक्चर

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` · स्थिति: Analyzed (लाइव हेडर से शब्दशः बहाल)

सात स्ट्रक्चर पैक से पढ़े/लिखे जा सकते हैं। हर फ़ील्ड नीचे सूचीबद्ध है (`#ifdef` वाले फ़ील्ड सशर्त हैं)। पूरा हेडर [इंजन-आंतरिक](../internals/engine-header.md) में है।

## BloxdVertexIn (vertex हुक इनपुट)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| फ़ील्ड | प्रकार | विवरण |
|---|---|---|
| `position` | `vec3f` | रेंडर-स्पेस स्थिति (विश्व स्पेस `bloxdWorldPosition()` से) |
| `normal` | `vec3f` | फलक से बाहर की ओर इशारा करता यूनिट वेक्टर |
| `localPosition` | `vec3f` | मॉडल-लोकल निर्देशांक; **terrain और liquid के लिए `vec3f(0.0)`**; प्लेयर की बाँह, हाथ में पकड़ी तलवार या पवन-चक्की के ब्लेड के लिए यह मॉडल के साथ घूमता है |
| `flags` | `BloxdFlags` | फलक की क़िस्म ([फ़्लैग](flags.md)) |

## BloxdVertex (vertex हुक आउटपुट)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (surface हुक इनपुट)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| फ़ील्ड | प्रकार | विवरण |
|---|---|---|
| `colour` | `vec3f` | RGB = texture × tint × AO, mesher द्वारा बेक किया हुआ |
| `alpha` | `f32` | अपारदर्शिता |
| `enchantTier` | `u32` | enchant टियर 1–5; जो enchant नहीं है उसके लिए 0 |
| `enchantColour` | `vec4f` | enchant का RGB और एक **एनिमेटेड** अल्फ़ा (`.a`) — प्रति-फ़्रैगमेंट `.a` पढ़ने पर चलता हुआ पैटर्न बिना किसी मेहनत के मिल जाता है; enchant न होने वाले फलकों पर पूरा शून्य |
| `enchantSpeed` | `f32` | enchant पैटर्न की रफ़्तार («faster at higher tiers») |
| `overlayColour` | `vec4f` | एंटिटी ओवरले (चोट की लाल झलक आदि) का RGB + अल्फ़ा; प्लेयर/मॉब के बाहर 0; लाइटिंग से पहले `bloxdLitColour` इसे मिला देता है |
| `position` / `normal` / `localPosition` / `flags` | — | वही अर्थ जो `BloxdVertexIn` के हैं, पर **vertex हुक के बाद** (हिलाए गए vertex के साथ-साथ चलते हैं) |
| `textureId` | `u32` | इस फलक का टेक्सचर; `bloxdTextureId*` से तुलना करें; **फलक पर टेक्सचर न होने पर 0** — ज़्यादातर मॉडल textureId 0 इस्तेमाल करते हैं (मॉडल के अपने टेक्सचर, प्लेयर स्किन) |
| `textureRotation` | `u32` | घड़ी की दिशा में चौथाई घूमाव (0–3), `bloxdTexel` लागू करता है |
| `uv` | `vec2f` | टेक्सचर 0–1 पर फैला हुआ; `fract(uv)` ड्रॉ होता है (पूर्णांक क़दम टाइलिंग बनाते हैं) |
| `mipLevel` | `f32` | mip लेवल: 0 = पूरा आकार, 1 = आधा… |

## BloxdSurface (surface हुक आउटपुट)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| फ़ील्ड | प्रकार | शर्त | विवरण |
|---|---|---|---|
| `colour` | `vec3f` | हमेशा | RGB आउटपुट |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (सभी liquid + ग़ैर-strict terrain/model) | अपारदर्शिता आउटपुट |
| `emission` | `vec3f` | हमेशा | emissive RGB — **लाइटिंग के बाद, फ़ॉग से पहले जुड़ता है** |
| `enchantColour` | `vec4f` | हमेशा | enchant आउटपुट, `bloxdLitColour` मिला देता है |
| `overlayColour` | `vec4f` | हमेशा | ओवरले आउटपुट, `bloxdLitColour` मिला देता है |

`bloxdDefaultSurface` `enchantColour` / `overlayColour` को बिना बदलाए पार जाने देता है, इसलिए डिफ़ॉल्ट रूप v4 के इंजन-आंतरिक आचरण से मेल खाता है। कस्टम लाइटिंग में चमक (glint) हटाने के लिए `out.enchantColour` शून्य कर दें; चोट की झलक उभारने के लिए `out.overlayColour.a` बढ़ा दें।

## BloxdLightIn (light हुक इनपुट)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

फ़ील्ड-दर-फ़ील्ड अर्थ और लाइटिंग गणित में भूमिका: देखें [लाइटिंग](lighting.md)।

**पुराने API संस्करणों के मुक़ाबले**: `fogVisibility` (v2–v4) अब `fogAlpha` है, उलटे अर्थों के साथ (0 = कोई फ़ॉग नहीं); `engineColour` अब `litColour` है; लाइट-लेवल का शब्द-प्रयोग है «0 when !bloxdLit()»। संस्करण-दर-संस्करण फ़ील्ड बदलावों की पूरी सूची: [संस्करण इतिहास](../history/)।

## BloxdLight (light हुक आउटपुट)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (स्पेशल-फ़ंक्शन रिटर्न)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

`bloxdOpaqueBehind()` की रिटर्न वैल्यू। liquid वेरिएंट में `#ifdef BLOXD_SCENE_DEPTH` गार्ड के पीछे इस्तेमाल करें (v2 में यह फ़ील्ड `found: bool` था)।

## सशर्त फ़ील्ड ↔ मैक्रो

| फ़ील्ड | कब मौजूद | टिप्पणी |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | सभी liquid वेरिएंट + ग़ैर-strict terrain/model |
| `bloxdOpaqueBehind()` कॉल | `#ifdef BLOXD_SCENE_DEPTH` | सभी liquid वेरिएंट |

`BLOXD_STRICT` **हुकों की मौजूदगी** (vertex हुक) तय करता है, स्ट्रक्चर का आकार नहीं। देखें [प्रीप्रोसेसर](preprocessor.md)।

## लेखन प्रथाएँ (पुनरावृत्ति)

- आउटपुट स्ट्रक्चर कभी सीधे न बनाएँ — `bloxdDefault*` से शुरू करें; light हुक में `var out = s;` भी चलता है
- ही `var x: BloxdSurface;` एक सत्यापन त्रुटि है
- हुक के पैरामीटर रीड-ओनली होते हैं — बदलने से पहले कॉपी करें

## संबंधित

- [लाइटिंग](lighting.md) · [फ़्लैग](flags.md) · [टेक्सचर API](texture-api.md)
