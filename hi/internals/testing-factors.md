# पैक-दृश्य मान बदलने वाली चीज़ें

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (2026-11-08, प्रोडक्शन और preprod) · स्थिति: Analyzed (प्रोडक्शन-बंडल JavaScript विश्लेषण)
वही पैक **दुनिया और खिलाड़ी की सेटिंगों** के आर-पार अलग-अलग रेंडर होता है। वितरण से पहले कम से कम इन 3 परिवेशों में जाँच करें:

1. **सामान्य दुनिया** (डिफ़ॉल्ट स्काईबॉक्स, कोई ओवरराइड नहीं) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, डिफ़ॉल्ट रंग
2. **अंतरिक्ष-स्काईबॉक्स दुनिया** — bloxdSunDirection() = 0। `sunPresent` शाखा का रूप
3. **`visionMinLightColour` / `skyLightColourOverride` वाली कस्टम दुनिया** — उठे हुए अंधेरे और रंग

मुख्य भिन्नता स्रोत: `lightingOverride` (बलात् प्रकाश) / `skyLightColourOverride`, `ambientLightColourOverride` (hex अदला-बदली) / `visionMinLightColour` ("सबसे गहरा दिखने वाला रंग" — कार्यान्वयन `uSkyLightColour` और `uAmbientLightColour` दोनों के विरुद्ध घटक-वार max के रूप में; Night Vision इसी का प्रयोग करता है — "घोर-अंधेरी गुफ़ा" वाले पैक जितना अभीष्ट है उतने गहरे नहीं हो पाते, और आकाश का रंग भी उठ जाता है) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() की विद्यमानता)। `uSkyLightColour` डिफ़ॉल्ट = (1,1,1) श्वेत, `uAmbientLightColour` डिफ़ॉल्ट = (0.25,0.25,0.30)। `l.ambient` का दृश्य घटक = ग्राफ़िक्स सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5)। `(1.0 - l.fogAlpha)` खिलाड़ी की फ़ॉग/चंक दूरी सेटिंग का अनुसरण करता है। साथ ही `cameraTint` (पूरी स्क्रीन पर RGBA टिंट) और `proximityFadeDistance` / `proximityFadeMinOpacity` (इकाइयों के लिए कैमरा-निकटता फ़ेड) भी दुनिया-सेटिंग के भिन्नता कारक हैं — विशेषकर `cameraTint` पैक आउटपुट के **ऊपर** कंपोज़िट होने वाली अंतिम पास है। इनमें से अनेक स्क्रिप्ट API (`serverOption`) से भी सेट किए जा सकते हैं और खेल चलते समय अपडेट भी हो सकते हैं।
