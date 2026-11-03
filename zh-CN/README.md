# Bloxd.io 着色器包开发文档

关于 Bloxd.io 的 WebGPU 渲染器着色器包的非官方文档——从创建、实现、验证、分发，到 API 规格与引擎内部研究。

## 当前规格

- 当前 API：**5**（`pack.json` 必须声明 `apiVersion: 5`）
- 目标：WebGPU 渲染器
- 最后验证：2026-11-03
- 目标构建：`ab90qa.main.6188124c.js`（正式服与预发布服为同一捆绑包——md5 `fc3322212d15be2445c0e8df9733fcc` 已验证）
- 着色器钩子：9 个（Terrain / Liquid / Model × Vertex / Surface / Light）

初次制作着色器包请从 [Getting Started](getting-started/)（英文）开始；查询 API 请看 [API Reference](api/)（英文）。

> 本文档不是游戏开发方的官方资料。引擎内部规格可能随更新变化——请确认各页面标注的目标构建与验证状态。
>
> 本指南借助 AI 协助编写，准确性不作保证。请以实际游戏行为为准验证。
>
> 着色器包功能本身是游戏内 UI 提供的官方功能，包是纯 WGSL（无 JS 执行、无网络访问），正常编写不会产生危险行为。

## 按目的选择入口

| 目的 | 分类 | 读者 |
|---|---|---|
| 制作第一个着色器包 | [Getting Started](getting-started/) | 初次制作者 |
| 查询 API 函数与字段 | [API Reference](api/) | 实现中的作者 |
| 实现某种效果（光、水、模型…） | [Guides & Recipes](guides/) | 追求观感的人 |
| 修复错误 | [Troubleshooting](troubleshooting/) | 包出问题的人 |
| 研究引擎内部 | [Engine Internals & Research](internals/) | 引擎分析者 |
| 查询旧版本 (v1–v5) | [Version History](history/) | 迁移旧包的人 |

## 文档结构

- **[Getting Started](getting-started/)** — 概览、快速开始、包结构、pack.json、9 个钩子、变体、验证、分发。通向第一个包的单线教程。
- **[API Reference](api/)** — 当前 API v5 的系统规格：钩子、标志、输入/输出结构体、全部函数、光照、纹理 API、常量、预处理器、限制、兼容性、896 个名称的纹理目录。
- **[Guides](guides/)** — 光照原理、阴影、水、夜晚、模型渲染、性能、写实思路。
- **[Recipes](recipes/)** — 按目的分类的代码示例。
- **[Troubleshooting](troubleshooting/)** — 按症状组织的排错。
- **[Engine Internals & Research](internals/)** — 渲染管线、钩子接入、引擎头文件、验证与编译内部、保留标识符、光照/雾内部、纹理采样与注册表、模型渲染、实测数据。
- **[Version History](history/)** — v1 到 v5：各版本变更、迁移步骤、废弃 API。

> 注：Getting Started / API Reference / Troubleshooting 以及 Guides、Recipes、Internals 中 v5 新增的页面当前以**英文**提供（与本站其他已翻译页面同构）。已翻译的历史内容全部保留在本语言版本中。

## 验证状态标签

| 标签 | 含义 |
|---|---|
| Verified | 已在目标构建上实测验证 |
| Analyzed | 通过分析内部实现确认 |
| Partially Verified | 仅部分确认 |
| Experimental | 实验性、未定 |
| Historical | 过去版本的资料 |
