# इंजन इंटर्नल्स

यह श्रेणी shader packs के निष्पादन को समझने में मदद करने वाले इंजन के आंतरिक व्यवहार का वर्णन करती है। कार्यान्वयन के ये विवरण गेम अपडेट के साथ बदल सकते हैं। स्थिर उपयोग नियमों और उपलब्ध APIs के लिए [API संदर्भ](../api/) देखें।

## नक्शा

| पेज | विषय-वस्तु |
|---|---|
| [रेंडरिंग पाइपलाइन](rendering-pipeline.md) | alphaTest की स्थिति, 2-प्रकाश सेटअप, uniform की हक़ीक़त, greedy meshing |
| [हुक इनवोकेशन](hook-invocation.md) | हुक इंजन के WGSL में कैसे जोड़े जाते हैं |
| [इंजन हेडर](engine-header.md) | Shader packs के आगे जोड़ी जाने वाली WGSL घोषणाएँ |
| [शेडर सत्यापन](shader-validation.md) | एनालाइज़र की आंतरिक बनावट, सिग्नेचर तालिका, HEADER_VERSION |
| [WGSL कंपाइलेशन](wgsl-compilation.md) | चरण-2 का असली कंपाइलेशन और सत्यापन स्टब |
| [आरक्षित पहचानकर्ता](reserved-identifiers.md) | 46 `bloxdSp*` प्रतीक |
| [प्रकाश इंटर्नल्स](lighting-internals.md) | blockLight / heldLight की संरचना |
| [फ़ॉग इंटर्नल्स](fog-internals.md) | केवल-रैखिक, 32-ब्लॉक प्रवणता पट्टी |
| [टेक्सचर सैंपलिंग](texture-sampling.md) | 3-वेरिएंट टेक्सचर कोडजेन |
| [टेक्सचर रजिस्ट्री](texture-registry.md) | नाम lookup, animation और rotation नाम |
| [मॉडल रेंडरिंग](model-rendering.md) | v5 का Model प्रोग्राम |
| [इंजन डेटा](engine-data.md) | API v5 सुविधाएँ और pack सीमाएँ |
| [परीक्षण कारक](testing-factors.md) | कौन-सी दुनिया/खिलाड़ी सेटिंग पैक-दृश्य मान बदलती हैं |
| [नीति](policy.md) | shaderPackPolicy — 12 allow शीर्षक |
| [सूर्य और चंद्र](sun-and-moon.md) | bloxdSunDirection को क्या खिलाता है |
| [दोषमार्जन](debugging.md) | URL पैरामीटर, आँकड़ा पैनल |


इंजन के आंतरिक कार्यान्वयन स्थिर API अनुबंध नहीं हैं। Packs बनाते समय [API संदर्भ](../api/) की सार्वजनिक specification को प्राथमिकता दें।
