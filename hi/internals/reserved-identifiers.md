# आरक्षित पहचानकर्ता इंटर्नल्स

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `bbb6l5` · स्थिति: Analyzed (लाइव बंडल के जनरेटरों से बहाल)

`bloxdSp*` नेमस्पेस — वे प्रतीक जो जनरेटर इंजेक्ट कर सकते हैं और जिन्हें पैक इसीलिए पुनः घोषित नहीं कर सकते। पैक-लेखकों के लिए सारांश: [प्रतिबंध](../api/restrictions.md)।
## 88 प्रतीक

v4 के 27 से v5 लॉन्च पर 46, और `bbb6l5` पर **88** (+42, 0 रिटायर; एकमात्र ऐतिहासिक सेवानिवृत्ति `bloxdSpLitColour` था — सार्वजनिक `bloxdLitColour()` में पदोन्नत):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`

## नए नाम ↔ `bbb6l5` की छाया प्रणाली

सभी 42 नए प्रतीक इंजन के सूर्य/चंद्र छाया कार्यान्वयन से आए हैं, जो `bloxdShadow()` / `bloxdAirShadow()` को आधार देता है:

- `bloxdSpSunShadow` / `bloxdSpShadowVolume` / `bloxdSpShadowVolumeSampler` / `bloxdSpShadowVoxels` — सूर्य-छाया वॉल्यूम (इंजन खिलाड़ी के चारों ओर भरती 3D टेक्सचर) और उसका सैंपलर
- `bloxdSpShadowMarch` / `bloxdSpMarch` / `bloxdSpOrigin` / `bloxdSpRayFresh` / `bloxdSpExitBox` — छाया किरण हल करने वाला रे-मार्च (64 चरण, stale-box ताज़गी परीक्षण)
- `bloxdSpShadowMask` / `bloxdSpShadowPixel` / `bloxdSpMaskBit` / `bloxdSpMaskEdge` — मास्क टेक्सचर पथ (किनारे-जागरूक सैंपलिंग)
- `bloxdSpEntityLight` / `bloxdSpShadowEntities` / `bloxdSpShadowEntityGrids` / `bloxdSpEntityRow` / `bloxdSpCasterBlocks` — एंटिटी छाया कास्टिंग (खिलाड़ी, मॉब, आइटम)
- `bloxdSpShadowPosition` / `bloxdSpShadowNormal` / `bloxdSpShadowEmissive` / `bloxdSpShadowFirstPerson` / `bloxdSpShadowLight` / `bloxdSpShadowDz` / `bloxdSpShadowZ` / `bloxdSpShadowSpecial` — प्रति-फ्रैग्मेंट छाया संदर्भ (emissive और first-person छूट)
- `bloxdSpVolumeAt` / `bloxdSpVolumeOpenLit` / `bloxdSpVolumeTexel` / `bloxdSpVolumeOut` / `bloxdSpVolumeWork` — वॉल्यूम लुकअप (`bloxdAirShadow` का केवल-ब्लॉक, पूरे-ब्लॉक-ब्लर पथ)
- `bloxdSpLit` / `bloxdSpFacing` / `bloxdSpFacingDot` / `bloxdSpT` / `bloxdSpCrossed` / `bloxdSpNormalCode` / `bloxdSpCellFull` / `bloxdSpWindowHas` / `bloxdSpWindowSlot` / `bloxdSpOwnTexture` / `bloxdSpPlaneTolerance` — छाया और सैंपलिंग कोडजेन के सहायक लोकल

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
