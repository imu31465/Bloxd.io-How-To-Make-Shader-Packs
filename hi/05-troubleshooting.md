[← पिछला भाग](04-realism.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](06-implementation.md)

# भाग V: समस्या-निवारण व टिप्पणियाँ

> वर्तमान खेल 2026-10-19 से `apiVersion: 3` चाहता है और लोड पर v1/v2 पैक अस्वीकृत करता है — नीचे की सामग्री v2 विनिर्देश पर लिखी गई है। वितरण से पहले माइग्रेशन के लिए [भाग IX](09-apiv3.md) देखें।

## 17. सामान्य त्रुटि व सुधार

| लक्षण | सुधार |
|---|---|
| strict खेल लोड नहीं | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `.alpha` अपरिभाषित कथित | `#ifdef BLOXD_ALPHA` में लपेटें |
| `blockLight` अपरिभाषित कथित | `#ifdef BLOXD_LIGHTING` में लपेटें। साझा सहायक फ़ंक्शन **समग्र फ़ंक्शन** लपेटें (v2 में फ़ील्ड सर्वदा होने से सामान्यतः नहीं होता। निर्णय प्रयोजन रक्षक रखें) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` से आरंभ बदलें |
| `pack.json needs "apiVersion": 3.` | `apiVersion` अभाव या `3` नहीं। अंक `3` पूरें (स्ट्रिंग `"3"` अस्वीकृत)। v1/v2 पैक `shaderPack:loadWrongApiVersion` से अस्वीकृत होते हैं |
| `There's no pack.json at the top of the pack.` | ZIP मूल में `pack.json` नहीं। फ़ोल्डर समग्र संवेष्टित जाँचें |
| `bloxdTerrainVertex must be declared as: fn ...` | हस्ताक्षर भिन्न। दर्शित घोषणा अक्षरशः पुनः लिखें |
| `bloxdTerrainVertex can't run in strict games...` | vertex हुक `#ifndef BLOXD_STRICT` में लपेटें |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` में लपेटें (v2 में फ़ील्ड सर्वदा होने से सामान्यतः नहीं होता) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` में लपेटें |
| `pow(l.skyLight, γ)` कितना भी छाया सघन नहीं | `skyLight` लिफ्ट वक्र बाद मान (कच्चा 0.87 से 0.97 आगमन)। R9.12 लिफ्ट व्युत्क्रम + देहली कट पर जाएँ (अध्याय 10) |
| `... can only be a function's parameter or return type, ...` | अनारंभिक `var x: BloxdSurface;` अस्वीकृत। `bloxdDefault*` से बनाएँ |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform पैक से सीधा संदर्भ असंभव। `bloxdTime()` आदि शीर्ष फ़ंक्शन से प्रयोग करें |
| `Packs can't declare bloxd_ names...` | अपने पहचानकर्ताओं से `bloxd_` उपसर्ग हटाएँ। केवल 6 हुक नाम परिभाषित कर सकते |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` आदि से आरंभ बदलें। light हुक प्रथम प्राचल प्रतिलिपि (`var out = s;`) से आरंभ भी योग्य |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` असंभव। `_ = f();` लिखें |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | टेरेन हुक भीतर `bloxdOpaqueBehind()` आह्वान `#ifdef BLOXD_SCENE_DEPTH` से लपेटें |
| `...only surface and light hooks can use.` | vertex हुक भीतर `bloxdOpaqueBehind()` हटाएँ (केवल surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | गहराई पठन ([भाग VIII](08-apiv2.md) §35) करने वाला पैक सक्रिय होने पर पेज पुनः लोड करके खोलें। गहराई टेक्सचर की तैयारी पेज निर्माण के समय तय होती है |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | त्रुटि नहीं, strict खेलों में स्वतः अक्षमता (`shaderPack:offInStrict`)। vertex हुक व `discard` `#ifndef BLOXD_STRICT` से लपेटें |
| `mixing '*' and '^' requires parenthesis (only in ...)` | दूसरा चरण (ब्राउज़र Tint) त्रुटि। `^` `&` `\|` `<<` `>>` के संक्रियांड कोष्ठकबद्ध करें (§38) |
| `loadDuplicateManifest` (zip पठन में) | `pack.json` 2 हैं (अक्षर-भेद सहित)। 1 करें |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL का `?renderer=` और localStorage का `bloxdRenderer` हटाकर पुनः लोड करें ([भाग VII](07-internals.md) §29) |
| दूर श्वेत धुंधला | बहुधा द्वि-फ़ॉग। पूर्ण रंग फ़ॉग लगा हुआ, स्वनिर्मित संयत रखें, संतृप्ति ही घटाना श्रेष्ठ |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | घने क्षेत्र या क्षेत्र-सीमा पार करते समय प्रकाश-स्रोतों की seed क्यू ओवरफ़्लो हो जाती है और उस चंक की लाइट गणना बीच में रोक दी जाती है। यह पैक से नहीं आता, पर **प्रकाश-स्रोतों के केंद्रीकरण पर लाइट की कमी इसी व्यवस्था** का परिणाम है; दुनिया में प्रकाश-स्रोत बिखेरकर इससे बचा जा सकता है |
| खेल प्रवेश पर पैक निष्कासित | खेल आरंभ वास्तविक-मशीन जाँच विफल। रक्षक चूक पुनः देखें |
| वास्तविक-मशीन जाँच पूरी न होकर `This device couldn't check …` आदि से पैक हट जाता है | जाँच का 60 सेकंड का अनिवार्य टाइमआउट है (अधिक समय `skipped` माना जाता है)। कम क्षमता वाले डिवाइस या भारी दुनिया में आम; भारी vertex प्रोसेसिंग व जटिल लूप कम करके पुनः प्रयास करें |

### लोडर-चरण त्रुटि ID सूची

सेटिंग्स स्क्रीन की त्रुटियों में `shaderPack:load*` ID जुड़ा होता है। पाठ खोज में सहायता हेतु:

| ID | अर्थ |
|---|---|
| `loadZipTooBig` | zip 32MB से अधिक |
| `loadTooManyZipEntries` | zip एंट्री 1024 से अधिक |
| `loadTooManyWgsl` | `.wgsl` 256 से अधिक |
| `loadSourceTooBig` | `.wgsl` कुल 256KB से अधिक (प्रति-फ़ाइल स्ट्रीमिंग जाँच) |
| `loadManifestTooBig` | `pack.json` 64KB से अधिक |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` JSON नहीं / ऑब्जेक्ट प्रकार नहीं |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` नहीं / `3` नहीं (v1/v2 अस्वीकृत) |
| `loadNoName` / `loadAuthorNotString` | `name` नहीं / `author` स्ट्रिंग नहीं |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | असमर्थित संपीड़न / zip64 / विभाजित / एन्क्रिप्टेड |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | पथ द्वैत / UTF-8 नहीं / विस्तार विफल / zip क्षति |

`loadNoManifest` / `loadDuplicateManifest` (pack.json की स्थिति / द्वैत) के लिए ऊपर की तालिका की संबंधित पंक्ति देखें।

## 18. अधिकार व टिप्पण

- शेडर पैक कार्य स्वयं खेल UI से लोड होने वाली आधिकारिक कार्य है, पैक निर्माण अपेक्षित व्यवहार मान्य है। पर सार्वजनिक आधिकारिक दस्तावेज़ अपुष्ट है
- पैक शुद्ध WGSL है, JS निष्पादन व जाल अभिगम रचनातः असंभव
- यह पुस्तक अनौपचारिक मार्गदर्शिका है, विकासकों की आधिकारिक स्थिति नहीं। API कभी भी बदल सकती है

[← पिछला भाग](04-realism.md)·[मैनुअल पर वापस जाएं](README.md)·[अगला भाग →](06-implementation.md)
