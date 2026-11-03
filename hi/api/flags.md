# फ़्लैग (BloxdFlags)

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` · स्थिति: Analyzed (लाइव हेडर से शब्दशः बहाल)

v5 फलकों की पहचान नाम वाले boolean स्ट्रक्चर से करता है। v4 का `blockFlags: u32` बिटमास्क और उसके 6 `bloxdBlockFlag*` कॉन्स्टैंट हटा दिए गए हैं।

## परिभाषा (हेडर से शब्दशः)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

## फ़ील्ड रेफ़रेंस

| फ़ील्ड | वर्ग | अर्थ | सामान्य वस्तुएँ | हुक |
|---|---|---|---|---|
| `opaque` | material | बिना गैप या छेद का पूर्ण घन | पत्थर, मिट्टी, ठोस लकड़ी | सभी 9 |
| `emissive` | material | प्रकाश उत्सर्जित करने वाले ब्लॉक | लावा, चमकते अयस्क | सभी 9 |
| `vegetation` | material | पत्तियाँ, घास के ब्लॉक, पत्तेदार पौधे | पत्ते, लंबी घास | सभी 9 |
| `dirt` | material | मिट्टी (घास के ब्लॉक सहित) | मिट्टी, घास ब्लॉक, Rocky Dirt (rock भी) | सभी 9 |
| `sand` | material | रेत और बलुआ-पत्थर परिवार | रेत, लाल रेत, हर बलुआ-पत्थर (rock भी) | सभी 9 |
| `rock` | material | पत्थर परिवार (+ बजरी, अयस्क, मैग्मा) | पत्थर के वेरिएंट, बजरी, अयस्क | सभी 9 |
| `slab` | shape | आधे ब्लॉक | स्लैब | Model हुक |
| `stairs` | shape | सीढ़ियाँ और कोने की सीढ़ियाँ | सीढ़ियाँ | Model हुक |
| `flat` | shape | समतल फलक (क्रॉस्ड प्लेन सहित) | लंबी घास, फूल, फ़सलें, मकड़जाल | Model हुक |
| `placed` | placement | चंक के हिस्से के रूप में रखी गई ज्यामिति | विश्व के ब्लॉक | Model हुक (आइटम/वाहन नहीं) |
| `held` | placement | हाथ में पकड़े गए आइटम (पहला/तीसरा व्यक्ति) | पकड़े आइटम, कवच | Model हुक |
| `dropped` | placement | ज़मीन / बेल्ट / पाइप पर पड़े आइटम | गिरे हुए आइटम | Model हुक |
| `thrown` | placement | हवा में उड़ते आइटम | स्नोबॉल, तीर, रॉकेट | Model हुक |
| `lifeform` | target | प्लेयर, मॉब, NPC (कवच और कॉस्मेटिक्स सहित) | एंटिटीज़ | Model हुक |

## फ़्लैग आज़ादी से जुड़ते हैं

**फ़्लैग कोई एक-विकल्प एनम नहीं हैं।** कोई भी संख्या एक साथ true हो सकती है — शायद कोई नहीं भी (हेडर ख़ुद कहता है *"Any number of flags may be set, possibly even none"*).

हेडर ख़ुद जो उदाहरण देता है:

- **बलुआ-पत्थर (sandstone) एक साथ `sand` और `rock` है**
- **Rocky Dirt एक साथ `dirt` और `rock` है**
- एक स्लैब एक ही समय पर `slab` और (सामग्री के हिसाब से) `rock` हो सकता है

किसी एक फ़्लैग की `else` शाखा को "बाकी सब कुछ" समझ लेना एक बग है। material फ़्लैग (`opaque`/`emissive`/…) shape/state फ़्लैगों (`slab`/`held`/…) के साथ **स्वतंत्र** रूप से जुड़ते हैं।

## उपयोग

`flags` तीनों इनपुट स्ट्रक्चरों (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`) पर इसी नाम का फ़ील्ड है:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

मॉडल पाइपलाइन में फ़्लैग इस सवाल का जवाब देते हैं — "मैं किसे देख रहा हूँ":

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // विश्व की एंटिटीज़ उभारें, हाथ को छोड़ें
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // स्थानीय प्लेयर के हाथ के आइटम रोशन करें
    }
    return out;
}
```

## v4 से माइग्रेशन (यांत्रिक)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

`bloxdBlockFlag*` कॉन्स्टैंट्स के बचे-खुचे संदर्भ एनालाइज़र के आरक्षित-नाम डायग्नॉस्टिक पर असफल हो जाते हैं (कॉन्स्टैंट मिटा दिए गए हैं)।

## एज केस (हेडर से, संपूर्ण)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` वाले फलक कभी Terrain प्रोग्राम में नहीं आते और `opaque` कभी सेट नहीं होता
- «Includes armour and cosmetics» — `lifeform` प्लेयर का उपकरण भी कवर करता है
- «Not items or vehicles» — `placed` वाहनों को बाहर रखता है

## संबंधित

- पूरा v4 माइग्रेशन → [संस्करण इतिहास: v5](../history/v5.md)
- फ़्लैग डिलीवरी की आंतरिकी → [इंजन-आंतरिक](../internals/rendering-pipeline.md)
