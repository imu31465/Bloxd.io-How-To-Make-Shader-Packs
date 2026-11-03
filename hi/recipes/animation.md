# काल रेसिपी (एनिमेशन)



> `bloxdSeconds()` हर 3600 सेकंड (1 घंटा) लपेटता है। शेडर बीता काल है, खेल के सूर्य·दिन-रात समन्वय की गारंटी नहीं। दिखावटी आवर्त एनिमेशन प्रयोज्य, वास्तविक रात निर्णय में `bloxdSunDirection()` व प्रकाश निवेश को प्राथमिकता दें।

## दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 एक घंटा आवर्त। खेल के दिन-रात समन्वय की गारंटी नहीं
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## डोलन (बहु sin अध्यारोपण)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## बहती पट्टी अरोरा / प्रतिदीप्त पट्टी

```wgsl
// XZ स्थिति व काल से 3 रंग मिलाएँ
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
