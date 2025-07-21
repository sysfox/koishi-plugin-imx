# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-07-21

### ✨ 新功能
- 🚀 **重大重构**: 完整迁移 mx-tg-bot 的所有功能到 Koishi 插件架构
- 📦 **模块化设计**: 重新设计为模块化架构，支持独立启用/禁用各功能模块
- 🎯 **Bilibili 直播监控**: 支持多个直播间监控，实时推送开播通知
- 🐙 **GitHub 集成**: 支持仓库状态查询和基础功能
- 🌟 **MX Space 集成**: 支持问候功能、一言获取等核心特性
- 🔧 **共享功能**: 集成复读机、工具命令等实用功能
- 📊 **错误通知**: 统一的错误处理和通知机制

### 🔧 技术改进
- ⚡ **现代化依赖**: 更新到最新的 Koishi v4.15.0+ 和相关依赖
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义和严格类型检查
- 📝 **丰富配置**: 支持详细的模块配置和功能开关
- 🎨 **代码规范**: 统一的代码风格和 ESLint 配置
- 🧪 **构建优化**: 改进的构建流程和开发体验

### 💔 破坏性变更
- 🔄 **架构重构**: 从独立 Bot 重构为 Koishi 插件，需要重新配置
- 📝 **配置格式**: 配置文件格式完全重新设计，不兼容旧版本
- 🎯 **命令变更**: 命令结构和语法进行了优化调整

### 📚 文档更新
- 📖 **安装指南**: 更新为 Koishi 插件安装方式
- ⚙️ **配置说明**: 详细的模块配置和功能说明
- 🚀 **迁移指南**: 从 mx-tg-bot 迁移的详细步骤

## [1.1.3] - 2025-07-21

### Changed
- 移除 OpenAI 相关依赖和不必要的包，优化 pnpm-lock.yaml

## [1.1.0] - 2025-07-21

### Removed
- **BREAKING**: 移除 OpenAI 集成功能
  - 删除 `ask` 命令
  - 删除 `chat` 命令
  - 删除 @ 机器人自动回复功能
  - 删除 OpenAI 相关配置选项
- **BREAKING**: 移除健康检查功能
  - 删除 `health` 命令
  - 删除健康检查模块和配置
- 从依赖中移除 `openai` 包

### Changed
- 更新插件描述，移除对 OpenAI 功能的引用
- 更新 README.md，移除相关功能说明
- 更新 package.json 关键词列表

## [1.0.3] - 2025-07-21

### Fixed
- 修复 CI 环境中 pnpm publish 的 git branch 检查问题
- 在发布流程中添加 --no-git-checks 参数

## [1.0.2] - 2025-07-21

### Fixed
- 修复 GitHub Actions release workflow 配置
- 替换废弃的 actions/create-release@v1 为 softprops/action-gh-release@v1
- 添加正确的 GitHub Actions 权限配置

## [1.0.1] - 2025-07-21

### Fixed
- 修复发布流程配置问题

## [1.0.0] - 2025-07-21

### Added
- IMX Bot 功能完整移植到 Koishi 平台
- **复读机功能**: 自动检测连续重复消息并复读，支持复读打断机制
- **工具命令模块**:
  - `tool.ip` - IP 地址查询功能
  - `tool.base64` - Base64 编码/解码
  - `tool.md5` - MD5 哈希计算
- **MX Space 集成**:
  - 自动早安/晚安问候功能
  - 新成员加入欢迎消息
  - `hitokoto` 一言命令
- **OpenAI 集成**:
  - `ask` 命令 - 单次 AI 询问
  - `chat` 命令 - 带上下文的 AI 对话
  - @ 机器人自动回复功能
  - 对话上下文管理
- **OpenAI 集成**:
  - `ask` 命令 - 单次 AI 询问
  - `chat` 命令 - 带上下文的 AI 对话
  - @ 机器人自动回复功能
  - 对话上下文管理
- **Bilibili 直播监控**:
  - 自动监控指定直播间开播状态
  - 开播时自动推送通知
  - `bili.status` 查看直播状态命令
- **GitHub Webhook 集成**:
  - 支持 Push、Issue、Pull Request 事件通知
  - 自动过滤机器人提交
  - `github.test` 测试通知功能
- **健康检查模块**:
  - `health` 命令查看系统状态
  - 监控内存使用、运行时间等信息
  - 可扩展的健康检查框架
- **健康检查模块**:
  - `health` 命令查看系统状态
  - 监控内存使用、运行时间等信息
  - 可扩展的健康检查框架

### Technical
- 使用 TypeScript 5+ 开发，提供完整类型支持
- 基于 Koishi 4.15+ 框架构建
- 模块化插件架构，支持按需启用功能
- 完整的配置系统，支持 Schema 验证
- 安全依赖更新，解决已知漏洞

### Dependencies
- koishi: ^4.15.0
- axios: ^1.6.0
- openai: ^4.0.0
- @mx-space/api-client: ^1.4.3
- socket.io-client: ^4.7.1
- dayjs: ^1.11.9

### Documentation
- 完整的 README.md 使用文档
- 配置说明和示例
- 从 IMX Bot 的迁移指南
- TypeScript 类型定义

## [0.1.0] - 2025-07-20

### Added
- 项目初始化
- 基础项目结构搭建
