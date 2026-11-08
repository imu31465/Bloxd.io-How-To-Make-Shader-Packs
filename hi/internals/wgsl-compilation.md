# WGSL कंपाइलेशन

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` · स्थिति: Analyzed (लाइव बंडल से बहाल)

सत्यापन का दूसरा चरण — ब्राउज़र के WGSL कंपाइलर से होने वाला असली संकलन — और v5 के सत्यापन स्टब।

## दो चरण क्यों

स्थैतिक सत्यापन की टाइप-जाँच अपूर्ण होती है, इसलिए कुछ ग़लतियाँ केवल यहीं सामने आती हैं (उदाहरण: `mixing '*' and '^' requires parenthesis` जैसी WGSL ऑपरेटर-प्राथमिकता की अपेक्षाएँ)। त्रुटियाँ खेल के भीतर वेरिएंट नाम के साथ सामने आती हैं ([कंपाइलेशन त्रुटियाँ](../troubleshooting/compilation.md))।

## सत्यापन-स्टब जनरेशन

इंजन स्थैतिक सत्यापन पास करने वाले कोड के लिए स्टब संश्लेषित करता है (मॉड्यूल 29866 से बहाल):

- टाइप-स्टब तालिका:

| प्रकार | स्टब मान |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` आदि |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` आदि |

- स्ट्रक्चर पुनरावर्ती रूप से बनते हैं — हर फ़ील्ड स्टब मानों से भरा जाता है (नेस्टेड स्ट्रक्चर पुनरावृत्ति करते हैं)
- संश्लेषित एंट्री पॉइंट:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

सत्यापन ब्राउज़र में वास्तव में "आपके हुकों को स्टब इनपुट देकर बुलाने वाला WGSL" संकलित करता है, जिससे वाक्यरचना, प्रकार और भाषा-सुविधा के उल्लंघन सामने आ जाते हैं।

## त्रुटि-संदेश नाम-बहाली

हुक कॉल स्प्लिस करते समय इंजन एक पहचानकर्ता मैपिंग (`originalNames`) रखता है। ब्राउज़र त्रुटियों के पहचानकर्ता **आपके मूल नामों पर वापस मैप** होते हैं, और `sourceOf(lineNum)` स्प्लिस की गई पंक्ति-संख्याओं को (फ़ाइल, पंक्ति) पर वापस ले जाता है — आप त्रुटियाँ बदले हुए पाठ के बजाय अपने ही कोड के मुक़ाबले पढ़ते हैं।

## जॉइन पर रनटाइम पुनः-सत्यापन

`checkCompilation` हर गेम-जॉइन पर चलता है और हर मौजूदा टेरेन सामग्री को वास्तव में संकलित करता है (सेटिंग्स-स्क्रीन जाँच से सख़्त)। विफल होने पर पैक उस गेम के लिए हटा दिया जाता है। जाँच का एक 60-सेकंड का बलात् टाइमआउट है ([परफ़ॉर्मेंस](../troubleshooting/performance.md))।

## संबंधित

- [कंपाइलेशन त्रुटियाँ](../troubleshooting/compilation.md) · [शेडर सत्यापन](shader-validation.md) · [शुरुआत: सत्यापन](../getting-started/validation.md)
