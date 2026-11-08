# शीर्ष (केवल allow)

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (2026-11-08, प्रोडक्शन और preprod) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
> सब कुछ `#ifndef BLOXD_STRICT` में लपेटें।
> सटीक शर्तों (allow शीर्षक सूची; Custom Games का strict होना) के लिए देखें [गेम-अनुसार शेडर-पैक नीति](../internals/policy.md)

## हवा में डोलती घास (केवल ऊपरी हिस्से हिलाएँ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // केवल ऊर्ध्वाधर फलक
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

## तरल सतह की तरंगें (केवल ऊपरी फलक)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdSeconds() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdSeconds() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

## साँस लेता टेरेन

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // अभिलंब की दिशा में हल्का फैलाव-सिकुड़ाव
    return out;
}
#endif
```

## लहराता टेरेन (विशाल sin तरंगें)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdSeconds() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdSeconds() * 0.7) * 0.3;
    return out;
}
#endif
```
