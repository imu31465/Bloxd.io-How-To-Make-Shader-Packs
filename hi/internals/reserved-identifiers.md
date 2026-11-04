# आरक्षित पहचानकर्ता इंटर्नल्स

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` · स्थिति: Analyzed (लाइव बंडल के जनरेटरों से बहाल)

`bloxdSp*` नेमस्पेस — वे प्रतीक जो जनरेटर इंजेक्ट कर सकते हैं और जिन्हें पैक इसीलिए पुनः घोषित नहीं कर सकते। पैक-लेखकों के लिए सारांश: [प्रतिबंध](../api/restrictions.md)।

## 46 प्रतीक

v4 के 27 से बढ़कर **46** (20 जोड़े गए, 1 सेवानिवृत्त — `bloxdSpLitColour`, जिसे सार्वजनिक `bloxdLitColour()` में पदोन्नत किया गया):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

## नए नाम ↔ v5 सुविधाएँ

- `bloxdSpFlags` — `BloxdFlags` स्ट्रक्चर की डिलीवरी
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — नए इनपुट (एनचैंट, मॉडल-स्थानीय स्थिति)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — सेल-सैंपलिंग टेक्सचर-पैक पथ
- `bloxdSpQuarterTurns` — रोटेशन श्रृंखला ([टेक्सचर सैंपलिंग](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — विस्तारित-हुक लोकल

## पैक-स्तरीय नियम

इस नेमस्पेस से भी व्यापक: **`/^bloxd/i` से मेल खाता सब कुछ (केस-असंवेदनशील)**। केवल 9 हुक फ़ंक्शन नाम ही घोषित किए जा सकते हैं ([सत्यापन त्रुटियाँ](../troubleshooting/validation.md))।

`bloxdTextureId`-उपसर्गी पहचानकर्ता टेक्सचर नामों के रूप में रिज़ॉल्व होते हैं, जिनका अपना समर्पित त्रुटि-परिवार है ([टेक्सचर समस्याएँ](../troubleshooting/textures.md))।

## संबंधित

- [प्रतिबंध](../api/restrictions.md) · [टेक्सचर सैंपलिंग](texture-sampling.md) · [संस्करण इतिहास: v5](../history/v5.md)
