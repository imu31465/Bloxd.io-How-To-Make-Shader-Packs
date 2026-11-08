# मॉडल और टेक्सचर

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (2026-11-08 को प्रोडक्शन और preprod में सत्यापित) · स्थिति: Analyzed (हेडर और सत्यापक से पुनर्प्राप्त)

नए v5 मॉडल हुक क्या बनाते और पढ़ते हैं।

## मॉडल प्रोग्राम क्या बनाता है

- **ब्लॉक मॉडल**: आधे ब्लॉक (`slab`), सीढ़ियाँ (`stairs`), क्रॉस-प्लेन पौधे — लंबी घास, फूल, फ़सलें, मकड़जाले (`flat`)
- **आइटम**: हाथ में पकड़े हुए (`held`), गिराए हुए (`dropped`), फेंके हुए (`thrown` — स्नोबॉल, तीर, रॉकेट)
- **एंटिटी**: खिलाड़ी, मॉब, NPC (`lifeform`) — **कवच और कॉस्मेटिक्स सहित**

टेरेन (पूरे ब्लॉक) और तरल (पानी) इस प्रोग्राम में कभी नहीं आते।

## क्या अलग तरह से पढ़ा जाता है

मॉडल फलक तीन चीज़ें ले जाते हैं जो टेरेन फलकों में कभी नहीं होतीं:

| सूचना | फ़ील्ड | टेरेन पर मान |
|---|---|---|
| मॉडल-स्थानीय निर्देशांक | `localPosition: vec3f` | `vec3f(0.0)` (कोई मॉडल नहीं) |
| एनचैंट अवस्था | `enchantTier` / `enchantColour` / `enchantSpeed` | सभी 0 |
| एंटिटी ओवरले | `overlayColour` | 0 |

और **टेक्सचर का अर्थ भी अलग है**: टेरेन फलक एटलस `textureId` ले जाते हैं, पर **अधिकांश मॉडल `textureId: 0`** ("कोई टेक्सचर नहीं") प्रयोग करते हैं — प्लेयर स्किन और मॉब टेक्सचर एटलस नेमस्पेस में नहीं होते। `surface.colour` में पहले से स्किन × रंगत शामिल है, इसलिए इसी से काम करें ([मॉडल-स्वामित्व टेक्सचर](../api/texture-api.md#मॉडल-स्वामित्व-टेक्सचर-textureid-0))।

`flags` के `held` / `dropped` / `thrown` / `lifeform` / `placed` केवल मॉडल फलकों पर अर्थ रखते हैं ([Flags](../api/flags.md))।

## localPosition

विश्व में रखे जाने से **पहले** की मॉडल-इंस्टेंस-स्थानीय स्थिति; टेरेन/तरल के लिए `vec3f(0.0)`।

- खिलाड़ी की भुजा, हाथ की तलवार या पवनचक्की के ब्लेड के लिए यह मॉडल के साथ घूमता है
- **भाग-दर-भाग कुंजीबद्ध एनिमेशन और झुकाव प्रभाव** एक-फ़ील्ड लेखन बन जाते हैं — "मैं ब्लेड पर कितना ऊपर हूँ" सीधे `localPosition.y` है
- लाइट स्ट्रक्ट में यह **शीर्ष-हुक-के-बाद का मान** है (हेडर: *"the same as in BloxdVertexIn, after the vertex hook"*)

## चयन पैटर्न

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // विश्व की एंटिटी उठाएँ, हाथ को छोड़ें
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // स्थानीय खिलाड़ी के पकड़े हुए आइटम उजले करें
    }
    return out;
}
```

पूरे उदाहरण: [मॉडल शेडर रेसिपियाँ](../recipes/model-shaders.md) और [एनचैंट प्रभाव](../recipes/enchant-effects.md)।

## टेरेन / तरल / मॉडल चीट-शीट

| किस पर असर चाहिए | हुक | चयन फ़ील्ड |
|---|---|---|
| पूरे-ब्लॉक का रूप | `bloxdTerrain*` | सामग्री फ़्लैग (`opaque` / `rock`…) |
| पानी | `bloxdLiquid*` | सदा तरल (कोई Liquid हुक नहीं = पानी अछुता) |
| पौधे, स्लैब, सीढ़ियाँ | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| पकड़े हुए आइटम | `bloxdModel*` | `flags.held` |
| गिराए हुए आइटम | `bloxdModel*` | `flags.dropped` |
| फेंके हुए आइटम | `bloxdModel*` | `flags.thrown` |
| खिलाड़ी और मॉब | `bloxdModel*` | `flags.lifeform` |

## प्रकाश

`bloxdModelLight` वही `BloxdSurface` / `BloxdLightIn` लेता है और `bloxdDefaultLight` / `bloxdLitColour()` के साथ काम करता है। एनचैंट चमक (`enchantColour`) और हर्ट फ़्लैश (`overlayColour`) `bloxdLitColour` के भीतर मिलते हैं, इसलिए **डिफ़ॉल्ट दोनों रूप अपने आप बनाए रखते हैं**; इन्हें नियंत्रित करने के लिए [एनचैंट प्रभाव](../recipes/enchant-effects.md) देखें।

## इंटर्नल्स

मॉडल कैसे रेंडर होते हैं और फ़्लैग/एनचैंट इनपुट कैसे बहते हैं: [इंजन इंटर्नल्स: मॉडल रेंडरिंग](../internals/model-rendering.md); `bloxdSpItemLocalPosition` और `bloxdSpEnchant` जैसे जनरेटेड प्रतीक [प्रतिबंधों](../api/restrictions.md) में सूचीबद्ध हैं।
