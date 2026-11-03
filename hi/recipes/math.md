# गणित टूलबॉक्स

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
```wgsl
// 0..1 का चिकना श्रेणीकरण (n श्रेणियाँ)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-स्तरीय देहली (टून छाया)
let shadow = smoothstep(0.35, 0.37, level);   // देहली के चारों ओर ±0.02 से सीढ़ियाँ बनती हैं

// 3-स्तरीय टून
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// लूमा (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// चिकना स्पंदन
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// त्रिभुज तरंग (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// सेकंड → "धीमा फ़ेज़" (3600 सेकंड के लपेट की उपेक्षा करने वाले प्रभावों के लिए)
let phase = t * 0.15;
```
