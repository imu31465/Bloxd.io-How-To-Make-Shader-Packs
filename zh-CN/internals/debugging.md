# 调试工具

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05, 生产环境) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

- URL 参数 `?renderer=lite` — 强制 Lite (WebGPU) 渲染器 (`webgl2` / `babylon` 亦可；`babylon` 是 webgl2 的旧名)。优先级：URL 参数 > localStorage `bloxdRenderer` > 设置画面 > 默认 (webgl2)。无效值附带警告忽略。URL 或 localStorage 中残留的覆盖会使需要 WebGPU (lite) 的场景以「needs the new WebGPU renderer, so remove the renderer override...」出错 ([加载错误](../troubleshooting/loading.md))
- URL 参数 `?vconsole` — 屏幕内控制台 (VConsole)。手机实机验证趁手
- URL 参数 `?drawcalls=1` — 追加绘制统计调试面板。可从调试控制台拾取游戏对象，或用 `drawCalls()` / `why()` / `configureDrawCallWatching()` 查看大型机制 (包内外) 的重绘与每一次绘制逼近约 65,000 顶点上限的情况——很适合定位性能瓶颈
- 控制台输出 `noa-engine v0.33.0` 与 `Renderer: lite from <来源>` — 先确认以防渲染路径误诊
- WebGPU 渲染器在包适用中锁定「强制 ON」。「Disable Block Texture Atlas」设置也锁定 (Atlas 保持 ON)，无 WebGPU 环境包根本无法适用。在分发页写「需要 WebGPU 浏览器」的根据在此
- 方块纹理为二维数组纹理 (`texture_2d_array`)，地形采样器为 nearest + repeat。mesher 还会将材质 / AO / 光照一致的面合并为一个矩形 (**greedy meshing**)，因此合并面的 UV 可能超过单个 tile 宽 (边缘内缩 0.0015)。平铺由硬件 repeat 寻址处理，合并面看起来无缝。注意依附 `vUV` 的程序化细节会在合并面边界断裂——请改为依附世界坐标 (`s.position` + `bloxdRenderOffset()`)
- 每次进游戏运行时重验证 (`checkCompilation`)，以浏览器 WebGPU 实编全部地形材质 (比设置画面静态验证更严)。此处失败的包被逐出该游戏
