# 性能

> 目标API: 5 · 状态: Verified

速度问题与修复。

## 实机检查一直跑不完并弃用了包

- **原因**: 该检查有 **60 秒强制超时** (超时按 `skipped` 处理) — 低配设备与重负载世界常见
- **修复**: 削减重型顶点运算与复杂循环后重试
- **预防**: 遵循[性能指南](../guides/performance.md)

## 帧率下降

- **检查**: 对比有无包时的 FPS；地形重的场景与水分开测
- **典型原因**: 无条件地对每个面跑重型效果 (无标志/距离选取)；高频哈希噪声；过大的 `pow` 指数
- **修复** ([指南](../guides/performance.md))：
  - 经 `flags` 把效果设门到需要它们的面
  - 按距离提前返回 (`distance(surface.position, bloxdEyePosition())`)
  - 上采一层 mip 让 `bloxdTexel` 读取更便宜
- **预防**: 增量添加细节并对比 FPS ([测试](../guides/testing.md))

## 只在移动端卡

- **原因**: 包跑在 WebGPU 渲染器上；移动 GPU 可能比桌面慢几十倍
- **修复**: 降低效果强度/频率、加强距离剔除 — 或明确标注不支持移动端 ([环境要求](../getting-started/requirements.md))

## 逼近 256 KB 包上限

- **修复**: 精简注释、把共享代码提炼成函数、删掉未用的配方 ([包结构](../getting-started/pack-structure.md))

## 相关

- [性能指南](../guides/performance.md) · [测试](../guides/testing.md)
