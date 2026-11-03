# सत्यापन त्रुटियाँ

> लक्ष्य API: 5 · स्थिति: Verified (संदेश लाइव वैलिडेटर से अक्षरशः दर्ज किए गए)

स्थैतिक सत्यापन (एनालाइज़र, चरण 1) की त्रुटियाँ — ज़्यादातर आरक्षित नाम, strict अनुबंध और हुकों-के-पार कॉल प्रतिबंध।

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **कारण**: `BloxdSurface(...)` जैसे कंस्ट्रक्टरों को बुलाना
- **समाधान**: `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` से शुरू करके फ़ील्ड बदलें (`var out = s;` light हुकों में चलता है)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **कारण**: `bloxd` से शुरू होने वाला पहचानकर्ता (केस-असंवेदनशील)
- **समाधान**: नाम बदलें (जैसे `packTint`)। केवल 9 हुक नाम अनुमत हैं
- **रोकथाम**: अपने नामों में `pack` / `my` आदि उपसर्ग लगाएँ

## "bloxdPackInputs isn't part of the bloxd_ header"

- **कारण**: uniform को सीधे संदर्भित करना
- **समाधान**: हेडर फ़ंक्शनों के ज़रिए उसका उपयोग करें ([पैक फ़ॉर्मैट](../api/pack-format.md#परत-फरम-uniform-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **कारण**: किसी vertex हुक (या उससे पहुँच योग्य किसी फ़ंक्शन) से कॉल — "reaches" का मतलब **कॉल पथ** है
- **समाधान**: कॉल को surface / light हुक में खिसकाएँ

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **कारण**: `bloxdOpaqueBehind()` को `BLOXD_SCENE_DEPTH` चाहिए, जो केवल सभी-liquid वेरिएंट में परिभाषित होता है; terrain/model-हुक कोड से यह कॉल साझा करना अन-कंपाइलेबल वेरिएंट बना देता है
- **समाधान**: कॉल को `#ifdef BLOXD_SCENE_DEPTH` में लपेटें
- **रोकथाम**: डेप्थ-पढ़ने को केवल-liquid प्रोसेसिंग के रूप में अलग रखें

## strict अनुबंध

| संदेश | अर्थ |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | बिना गार्ड का vertex हुक |
| `discard makes terrain see-through, which strict games prevent.` | पहुँच योग्य `discard` |

- **महत्वपूर्ण**: ये कंपाइल त्रुटियाँ नहीं हैं — strict गेम **पूरे पैक को अपने आप निष्क्रिय** कर देते हैं (`shaderPack:offInStrict`)
- **समाधान**: vertex हुकों और `discard` को `#ifndef BLOXD_STRICT` में लपेटें ([वेरिएंट](../getting-started/variants.md))

## मौजूदा-संस्करण संदेश

| संदेश | कार्रवाई |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` माइग्रेट करें ([लाइटिंग](../api/lighting.md#bloxdlit--गट)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | छूटा हुआ बिट कॉन्स्टैंट → `flags.rock` ([फ़्लैग](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 का आंतरिक प्रतीक → सार्वजनिक `bloxdLitColour()` का उपयोग करें |

जो पैक `blockFlags` पढ़ते रहते हैं या अपने light हुकों को `#ifdef BLOXD_LIGHTING` में लपेटते हैं, एनालाइज़र उन्हें **समर्पित संदेश** देता है, ताकि कुछ भी चुपचाप ग़लत न चले (माइग्रेशन चरण: [v5 माइग्रेशन](../history/v5.md))।

टेक्सचर-नाम रिज़ॉल्यूशन की त्रुटियाँ (स्पेलिंग सुझाव, फ़्रेम/रोटेशन स्पेलिंग) [टेक्सचर समस्याएँ](textures.md) में हैं।

## संबंधित

- [प्रतिबंध और आरक्षित नाम](../api/restrictions.md) · [इंजन इंटर्नल्स: शेडर सत्यापन](../internals/shader-validation.md) · [वेरिएंट-विशिष्ट समस्याएँ](variants.md)
