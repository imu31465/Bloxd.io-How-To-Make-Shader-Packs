# समय और एनिमेशन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `xkg8x` (2026-11-04, production) · स्थिति: Verified (वर्तमान API पर पोर्ट किया गया — डिवाइस पर पुनः जाँच की सिफ़ारिश)
> `bloxdSeconds()` हर 3600 सेकंड (1 घंटा) पर लपेट जाता है। ध्यान दें कि यह शेडर का बीता समय है और खेल के सूर्य/दिन-रात से मेल खाने की गारंटी नहीं है। इसे दृश्य-आवर्ती एनिमेशन के लिए प्रयोग करें, पर वास्तविक रात की पहचान के लिए `bloxdSunDirection()` और प्रकाश इनपुट को प्राथमिकता दें।

## दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 एक-घंटे का आवर्त; खेल के दिन-रात से मेल ज़रूरी नहीं
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## डोलन (परतदार sin)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## बहती अरोरा पट्टियाँ / प्रतिदीप्त धारियाँ

```wgsl
// XZ स्थिति और समय से 3 रंग मिलाएँ
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
