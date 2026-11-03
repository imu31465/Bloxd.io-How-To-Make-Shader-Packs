# गेम-अनुसार अनुप्रयोग मोड (`shaderPackPolicy`)



यहाँ §7 की `allow / strict` अवधारणा का शीर्षक-स्तरीय अर्थ निश्चित किया जाता है। केवल वही शीर्षक, जिनकी गेम-परिभाषा में स्पष्ट रूप से `shaderPackPolicy: "allow"` है, पूर्ण मोड (vertex हुक, `discard`, टेरेन `alpha`) में चलते हैं; बिना निर्दिष्ट शीर्षक (या allow के अतिरिक्त मान) strict होते हैं — `BLOXD_STRICT` परिभाषित होता है और गार्ड में लिखा कोड स्वतः निष्क्रिय हो जाता है। यह निर्णय पैके के पक्ष से नहीं चुना जा सकता; अतः किस शीर्षक में क्या चलता है, यह जान लेना वितरण की पूर्वशर्त है।

- संदर्भ-बिल्ड: `szby6g.main.94a7596c.js` (2026-10-17 का प्रोडक्शन-डिप्लॉय)। सभी 111 गेम-परिभाषाओं का स्थैतिक विश्लेषण — परिणाम: **allow 26 प्रविष्टियाँ (12 शीर्षक) / strict 85 प्रविष्टियाँ**। वही 12 allow लिटरल उन्हीं 12 शीर्षकों में v3 प्रोडक्शन बंडल (`3ymzdd`, 2026-10-20) पर अपरिवर्तित पुनः पुष्ट हुए — नीचे की सूची v3 में शब्दशः लागू रहती है।
- `shaderPackPolicy` से भी ऊपर वितरण-चैनल पक्ष का गेट (`canUseShaderPacks` के समान) है; बाहरी पोर्टल से वितरण (Coolmath Games संस्करण आदि) में `shaderPackPolicy` के निर्णय से पहले ही शेडर-पैक तंत्र निष्क्रिय हो सकता है। नीचे का allow / strict वर्गीकरण bloxd.io मूल Web संस्करण के विश्लेषण पर आधारित है।
- allow 12 स्थानों पर घोषित है: गेम-परिभाषाओं में सीधे लिखे गए 8 स्थान और आधार-चर (`tb` / `kz` / `cb` / `Fb`) के 4 स्थान; वेरिएंट्स स्प्रेड विरासत (`{...tb,...}`) से इसे ग्रहण करते हैं। वेरिएंट-स्तरीय अलग ओवरराइड (पिता-allow / पुत्र-strict की उलटी रूपरेखा) अभी कोई नहीं।

12 allow शीर्षक (कुल 26 प्रविष्टियाँ):

- **Test Gym** — मुख्य + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (कुल 11 प्रविष्टियाँ)
- **Doodle Cube** — मुख्य + Solos / Duos (कुल 3)
- **Rocket Obby** — मुख्य + Sheep / January (कुल 3)
- **9 एकल शीर्षक**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict पक्ष में विशेष रूप से भ्रामक बिंदु:

- **Superflat Creative (classic_creativeFlat) strict है**। नाम में "Creative" है, पर classic परिवार में allow केवल साधारण Creative (`classic_creative`) है। Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns आदि भी सब strict
- **Custom Games (customGames) strict है**। स्वनिर्मित कस्टम गेम में vertex हुक-धारा के प्रभाव सक्रिय नहीं होते। सत्यापन कार्य के लिए Test Gym ही भरोसेमंद विकल्प है
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) जैसे प्रमुख PvP व सर्वर शीर्षक सब strict

इसके अलावा strict शीर्षकों में भी पैक का लोड व कंपाइल होता रहता है, और surface / light जैसी फ़्रैगमेंट-पक्ष की रेसिपी सामान्य रूप से चलती हैं। प्रतिबंध केवल vertex हुक (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` और टेरेन `alpha` पर हैं (तरल में हमेशा मौजूद)।

यह सूची उपरोक्त बिल्ड के स्थैतिक विश्लेषण का परिणाम है; इंजन-अपडेट से allow/strict का वितरण बदल सकता है। नया संस्करण आने पर पुनः जाँचें।
