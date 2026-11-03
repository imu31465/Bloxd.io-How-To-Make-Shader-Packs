# पैक दृश्य मान बदलने वाली चीज़ें — परीक्षण सूची



वही पैक **दुनिया व खिलाड़ी सेटिंग के अनुसार `l.*` की सामग्री बदलने** से अलग दिखता है। वितरण से पहले कम से कम इन 3 परिवेशों में रूप देखें:

1. **सामान्य दुनिया** (डिफ़ॉल्ट आकाशपेटी, ओवरराइड नहीं) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, डिफ़ॉल्ट वर्ण
2. **अंतरिक्ष आकाशपेटी दुनिया** — bloxdSunDirection() = 0। `sunPresent` शाखा रूप
3. **अनुकूलित दुनिया `visionMinLightColour` / `skyLightColourOverride` सहित** — उठे अंधेरे व वर्ण

मुख्य भिन्नता स्रोत: `lightingOverride` (बलात् प्रकाश) / `skyLightColourOverride`, `ambientLightColourOverride` (hex अदला-बदली) / `visionMinLightColour` ("दिखने वाला सबसे गाढ़ा वर्ण" — कार्यान्वयन `uSkyLightColour` और `uAmbientLightColour` दोनों पर घटक-वार max; Night Vision प्रयोग करता है — "गुफा घोर अंधेरी" पैक सोचा अंधेरा नहीं करते, आकाश का रंग भी ऊपर उठता है) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() विद्यमानता)। `uSkyLightColour` डिफ़ॉल्ट = (1,1,1) श्वेत, `uAmbientLightColour` डिफ़ॉल्ट = (0.25,0.25,0.30)। `l.ambient` दृश्य पक्ष = ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5)। `(1.0 - l.fogAlpha)` खिलाड़ी फ़ॉग/चंक दूरी सेटिंग का अनुगमन करता है। साथ ही `cameraTint` (पूरे परदे पर RGBA टिंट) और `proximityFadeDistance`, `proximityFadeMinOpacity` (इकाई का कैमरा-निकट फ़ेड) भी दुनिया-सेटिंग से बदलने वाले कारक हैं, विशेषकर `cameraTint` पैक आउटपुट के ऊपर लगने वाली अंतिम प्रक्रिया है। इनमें से अनेक स्क्रिप्ट API (`serverOption`) से भी सेट हो सकते हैं और खेल चलते समय भी बदल सकते हैं।
