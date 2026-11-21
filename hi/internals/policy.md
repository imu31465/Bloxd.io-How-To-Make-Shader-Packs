# प्रति-गेम शेडर-पैक पॉलिसी

> लक्ष्य API: 5 · प्रकार: तकनीकी संदर्भ

यह पेज `allow / strict` के शीर्षक-स्तरीय अर्थ को पक्का करता है। केवल वही शीर्षक पूर्ण मोड (vertex हुक, `discard`, terrain `alpha`) में चलते हैं जिनकी गेम परिभाषा साफ़ तौर पर `shaderPackPolicy: "allow"` ले चलती है; बिना सेटिंग वाले (या कोई भी ग़ैर-allow मान वाले) शीर्षक strict हैं — `BLOXD_STRICT` परिभाषित होता है और गार्डेड कोड अपने आप निष्क्रिय हो जाता है। पैक-पक्ष यह नहीं चुन सकता, इसलिए यह जानना कि कौन-सा शीर्षक क्या चलाता है, वितरण की पूर्व-शर्त है।

- `shaderPackPolicy` के ऊपर एक डिलीवरी-चैनल द्वार भी है (मोटे तौर पर `canUseShaderPacks`): बाहरी पोर्टलों (जैसे Coolmath Games बिल्ड) के ज़रिए शेडर पैक सिस्टम ख़ुद `shaderPackPolicy` के देखे जाने से पहले ही बंद किया जा सकता है। नीचे का allow/strict विश्लेषण bloxd.io के मुख्य वेब बिल्ड पर आधारित है।


## allow वाले गेम

- **Test Gym** — बेस + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (13 प्रविष्टियाँ)
- **Doodle Cube** — बेस + Solos / Duos (3)
- **Rocket Obby** — बेस + Sheep / January (3)
- **9 अकेले शीर्षक**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

सबसे भ्रमित करने वाले strict-पक्ष के मामले:

- **Superflat Creative (classic_creativeFlat) strict है।** नाम में "Creative" आता है, पर classic फ़ैमिली में केवल सामान्य Creative (`classic_creative`) ही allow है। Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns आदि सभी strict हैं
- **Custom Games (customGames) strict है।** उपयोगकर्ता-निर्मित कस्टम गेमों में vertex-हुक प्रभाव नहीं चलते। सत्यापन-कार्य के लिए Test Gym ही सुरक्षित विकल्प है
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) जैसे बड़े PvP / सर्वर शीर्षक सभी strict हैं

ध्यान दें कि strict शीर्षकों में पैक फिर भी लोड और कंपाइल होता है, और surface / light जैसी फ़्रैगमेंट-पक्ष रेसिपें हमेशा की तरह चलती हैं। जो रोका जाता है वह है: vertex हुक (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, और terrain `alpha` (लिक्विड में यह हमेशा रहता है)।


Pack वितरित करने से पहले उसे लक्ष्य गेम में चलाकर जाँचें कि आवश्यक hooks वहाँ काम करते हैं।
