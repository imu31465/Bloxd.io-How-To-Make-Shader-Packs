# 验证

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03 生产环境确认) · 状态: Verified

## 三阶段加载检查

1. **加载器限制** — 大小、形态、manifest 有效性 (见[包结构](pack-structure.md))
2. **静态验证 (分析器)** — 语法、类型、保留名称、strict 契约，覆盖全部 6 种变体
3. **浏览器中的真实 WebGPU 编译** — 静态验证的类型检查并不完整，有些错误只在这里暴露

阅读各类错误请看[故障排查](../troubleshooting/) (按症状组织)。

## 流程

1. 从设置 → Shader Pack 加载 zip 或文件夹
2. 查看状态: 选中后立刻显示「Ready. Reload the page to use it.」；**页面重载后**显示「Ready to use」即成功
3. 若显示「Saved, but it won't run until you fix these errors...」，修复列出的错误 (文件:行号 + 变体) 后重载
4. 先在宽松 (allow) 的游戏中测试，再在 strict 模式游戏 (大多数游戏) 中测试。顶点动画只在 allow 游戏中有效
5. 替换包从同一界面重新加载；改动需要页面重载
6. 用 Remove Pack 移除。游戏更新后，已保存的包会在页面加载时自动重新验证 (标头/注册表变化会把它们标记为「需要重新检查」)

## 实机测试清单

完整清单以及会改变包所见之因素的完整列表，见[测试指南](../guides/testing.md)。
