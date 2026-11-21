# कम्पैटिबिलिटी

> लक्ष्य API: 5 · प्रकार: API संदर्भ

यह पृष्ठ बताता है कि वर्तमान गेम shader-pack API के किन संस्करणों को स्वीकार करता है और पुराने संस्करणों के लिए सहेजे गए packs को कैसे संभालता है।

## स्वीकृत API संस्करण

वर्तमान गेम केवल उन्हीं packs को स्वीकार करता है जिनके manifest में `apiVersion` का संख्यात्मक मान `5` हो। स्ट्रिंग `"5"` स्वीकार नहीं की जाती। API v1–v4 के लिए बनाए गए packs को लोड करने से पहले माइग्रेट करना होगा।

## लोड के समय संदेश

- `pack.json needs "apiVersion": {{version}}.` — `apiVersion` कुंजी मौजूद नहीं है
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — दिया गया संस्करण वर्तमान संस्करण से मेल नहीं खाता

## पुराने संस्करणों के लिए सहेजे गए packs

पुराने API संस्करण के लिए सहेजा गया pack वर्तमान गेम में नहीं चलेगा। Shader-pack settings स्क्रीन बताती है कि pack का संस्करण समर्थित नहीं है। संबंधित माइग्रेशन गाइड के अनुसार pack अपडेट करें।

## सहेजे गए packs का दोबारा सत्यापन

इंजन द्वारा दिए गए headers या texture-name definitions बदलने पर सहेजे गए packs दोबारा सत्यापित होते हैं। गेम लोड होने पर यह जाँच अपने आप होती है। Pack code में textures को नामित constants से संदर्भित करें, ऐसे संख्यात्मक IDs से नहीं जो बदल सकती हैं।

## रनटाइम कम्पैटिबिलिटी

- **WebGPU:** Shader packs के लिए WebGPU-सक्षम renderer आवश्यक है।
- **मोबाइल:** जिन वातावरणों में WebGPU समर्थित नहीं है, वहाँ shader packs उपलब्ध नहीं हैं ([आवश्यकताएँ](../getting-started/requirements.md))।
- **Texture access:** जिन renderer configurations में texture atlas का उपयोग नहीं होता, वहाँ `bloxdTexel` और `bloxdTextureSize` सामान्य atlas-texture access नहीं देते ([Texture API](texture-api.md))।

## API संस्करण समर्थन

| API संस्करण | वर्तमान गेम में समर्थन |
|---|---|
| v1 | लोड पर अस्वीकृत |
| v2 | लोड पर अस्वीकृत |
| v3 | लोड पर अस्वीकृत |
| v4 | लोड पर अस्वीकृत |
| **v5** | **वर्तमान** |

## संबंधित

- [v4 से v5 माइग्रेशन](../history/v5.md)
- [वर्शन हिस्ट्री](../history/)
