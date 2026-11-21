# आंतरिक टेक्सचर रजिस्ट्री

> लक्ष्य API: 5 · स्थिति: Analyzed

यह पृष्ठ बताता है कि टेक्सचर नाम कैसे resolve होते हैं और shader packs उन्हें कैसे refer करते हैं। Pack authors के लिए उपलब्ध नाम [texture catalog](../api/texture-catalog.md) में हैं।

## Named constants

Packs में `bloxdTextureId*` प्रारूप वाले named constants का उपयोग करें। Pack लोड होने पर टेक्सचर नाम registry के विरुद्ध resolve होते हैं, इसलिए numeric IDs को hard-code करने की आवश्यकता नहीं है।

**नामों को API मानें; numeric IDs पर निर्भर न रहें।** Atlas layout और IDs implementation details हैं और बदल सकते हैं।

## Animated textures

Animated textures को frame number से नहीं, उनकी family के base name से refer करें। Sampling के समय इंजन वर्तमान frame चुनता है, इसलिए pack को खुद frames आगे बढ़ाने की आवश्यकता नहीं है।

Frame spellings सामान्य उपयोग के लिए अलग named constants नहीं हैं। Catalog में दिए गए base names का उपयोग करें।

## Rotated textures

हर face की rotation texture sampling के समय लागू होती है। Packs को internal pre-rotated atlas slots सीधे चुनने की ज़रूरत नहीं है।

## Sampling notes

- नाम [texture catalog](../api/texture-catalog.md) से चुनें।
- Numeric IDs या internal atlas layout पर निर्भर न रहें।
- सामान्यतः animation और face rotation इंजन की sampling प्रक्रिया पर छोड़ें।

## संबंधित पृष्ठ

- [Texture API](../api/texture-api.md) — `bloxdTexel` और named constants
- [Texture catalog](../api/texture-catalog.md) — उपयोग योग्य texture names
- [अनुसंधान लॉग](research-log.md) — जाँच संबंधी टिप्पणियाँ कैसे पढ़ें
