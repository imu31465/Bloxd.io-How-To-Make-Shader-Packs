# निर्देशांक

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `ab90qa` (2026-11-03, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
## विश्व निर्देशांक

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## ब्लॉक निर्देशांक

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## शतरंजी पैटर्न (प्रति ब्लॉक)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 या 1
out.colour *= mix(0.96, 1.04, checker);
```

## प्रति-ब्लॉक छद्म यादृच्छिक (हैश)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// उपयोग: घास के रंग में भिन्नता, पत्थर का धब्बेदारपन आदि
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## दृष्टि सदिश और रिम प्रकाश

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## देखने का कोण (फ्रेनेल रूप — तरलों के लिए)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // सीधे सामने 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```
