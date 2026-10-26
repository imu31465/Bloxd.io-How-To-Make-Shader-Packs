[← पिछला भाग](09-apiv3.md)·[मैनुअल पर वापस जाएं](README.md)

# भाग X: API Version 4 माइग्रेशन गाइड (2026-10-26, सारांश)

> यह इस भाषा में संक्षिप्त सारांश है। सभी विवरणों, उदाहरण रेसिपी और पुनर्स्थापित इंजन-आंतरिक तथ्यों (§55–§66) सहित पूर्ण संस्करण [अंग्रेज़ी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) और [जापानी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) में है।

लक्ष्य बिल्ड: `cnty9.main.669f8081.js` — **2026-10-26 से उत्पादन और preprod दोनों में एक साथ लाइव** (दोनों बाइट-समान)। पैक मॉडल अपना स्वरूप बनाए रखता है: वही `pack.json` फ़ील्ड, वही लोडर सीमाएँ, वही 64 B uniform, वही 6 हुक।

## क्या बदलता है

- `pack.json` में `"apiVersion": 4` चाहिए (सख़्त `===`, संख्या) — v3 पैक लोड पर अस्वीकृत।
- **नया टेक्सचर API (मुख्य आकर्षण):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` ब्लॉक-टेक्सचर एटलस को ठीक वैसे ही सैंपल करता है जैसे इंजन स्वयं करता है (id 0 = सफ़ेद; एनिमेटेड टेक्सचर स्वतः वर्तमान फ़्रेम देते हैं), `bloxdTextureSize(mipLevel) -> vec2u`, और नामित स्थिरांक `bloxdTextureId*` (फ़ाइल-नाम से CamelCase, जैसे `grass_top` → `bloxdTextureIdGrassTop`; आधिकारिक सूची `BLOCK_TEXTURES.md` है)।
- `BloxdSurfaceIn` *और* `BloxdLightIn` में **चार नए इनपुट फ़ील्ड**: `textureId`, `textureRotation` (दक्षिणावर्त चौथाई घुमाव, जिसे `bloxdTexel` लागू करता है), `uv` (ब्लॉक में; `fract(uv)` अंकित होता है), `mipLevel`।
- **अर्थ-बदलाव के साथ पुनर्नामकरण:** `fogVisibility` → `fogAlpha` **उलटे** अर्थ के साथ (`0 = कोई फ़ॉग नहीं, 1 = केवल fogColour`; पोर्ट: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (काय समान); `BloxdOpaqueBehind.found` → `hit`।
- **strict गेम अब बंडल के वैलिडेटर से लागू होते हैं:** असुरक्षित वर्टेक्स हुक या पहुँच-योग्य `discard` पर `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` संदेश आता है और strict गेमों में **सभी** हुक निष्क्रिय हो जाते हैं। `#ifndef BLOXD_STRICT` रैपर से surface/light चलते रहते हैं।
- बाकी सब जमा हुआ: 6 हुक, `blockFlags` बिट (1/2/4/8/16/32), uniform लेआउट, लोडर सीमाएँ, वेरिएंट मैट्रिक्स, 12 allow शीर्षक (`cnty9` पर 2026-10-27 को अपरिवर्तित पुष्ट)।

## संक्षिप्त माइग्रेशन

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (संख्या) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` या `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| असुरक्षित वर्टेक्स हुक | `#ifndef BLOXD_STRICT ... #endif` |

संपूर्ण संदर्भ सामग्री अब गाइड का हिस्सा है: पूर्ण रूप से पुनर्स्थापित इंजन हेडर और सभी 905 प्रयोज्य नामों वाला पूर्ण टेक्सचर कैटलॉग भाग XI (`11-reference.md`) में है। पूर्ण विवरण — `bloxdTexel` की रोटेशन-बारीकी, पुनर्स्थापित सैंपलिंग WGSL, नाम-रजिस्ट्री, रजिस्ट्री-हैश सहित नया `HEADER_VERSION` — अंग्रेज़ी और जापानी पूर्ण संस्करण में हैं।

[← पिछला भाग](09-apiv3.md)·[मैनुअल पर वापस जाएं](README.md)
