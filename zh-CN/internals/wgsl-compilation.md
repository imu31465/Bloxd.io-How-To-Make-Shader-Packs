# WGSL 编译

> 目标API: 5 · 目标构建: `bny9u` · 状态: Analyzed (从现行 bundle 复原)

第二验证阶段 — 经浏览器 WGSL 编译器的真实编译 — 以及 v5 的验证桩。

## 为什么分两个阶段

静态验证的类型检查并不完整，因此有些错误只在这里暴露 (例如 WGSL 的运算符优先级要求，如 `mixing '*' and '^' requires parenthesis`)。错误会带着变体名出现在游戏内 ([编译错误](../troubleshooting/compilation.md))。

## 验证桩的生成

引擎为通过静态验证的代码合成桩 (从模块 29866 复原)：

- 类型桩表：

| 类型 | 桩值 |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` 等 |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` 等 |

- 结构体递归构造 — 每个字段填入桩值 (嵌套结构体递归)
- 合成的入口点：

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

验证字面上就是在浏览器里编译「以桩输入调用你钩子的 WGSL」，从而暴露语法、类型与语言特性违规。

## 错误消息的名称还原

拼接钩子调用时，引擎保留一份标识符映射 (`originalNames`)。浏览器错误中的标识符会被映射**回你的原始名称**，`sourceOf(lineNum)` 把拼接后的行号映射回 (文件, 行) — 你读到的是针对自己代码的错误，而不是变换后文本的。

## 加入游戏时的运行时重验

`checkCompilation` 在每次加入游戏时运行，实际编译每一个既存的地形材质 (比设置界面的检查更严)。失败则该游戏弃用该包。该检查有 60 秒强制超时 ([性能](../troubleshooting/performance.md))。

## 相关

- [编译错误](../troubleshooting/compilation.md) · [着色器验证](shader-validation.md) · [入门指南: 验证](../getting-started/validation.md)
