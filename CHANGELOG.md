# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.9] - 2025-07-22

### Fixed
- fix: 修复统计信息输出，确保在未定义时返回默认值


## [2.2.8] - 2025-07-22

### Added
- 请在此处添加新功能描述

### Changed
- 请在此处添加修改的功能描述

### Fixed
- 请在此处添加修复的问题描述


## [2.2.7] - 2025-07-22

### Fixed
- fix: 修复统计信息获取时的变量名，确保未定义时返回默认值


## [2.2.6] - 2025-07-22

### Fixed
- mx-space stat 命令获取数据解析方法错误


## [2.2.5] - 2025-07-22

### Changed
- mx-space stat 命令改为 GET 方式获取

## [Unreleased]

## [2.2.4] - 2025-07-22

### 🐛 修复问题

- 🔧 **MX Space 事件处理**: 修复 POST_CREATE 等事件类型大小写不匹配的问题
  - 将事件类型从小写改为大写以匹配实际的 MX Space webhook 事件格式
  - 修复了 POST_CREATE、POST_UPDATE、NOTE_CREATE 等事件无法正确处理的问题
  - 现在能够正确响应 MX Space 发送的所有支持的 webhook 事件

## [2.2.3] - 2025-07-22

### ✨ 新增功能

- 📢 **广播功能**: 新增强大的消息广播系统，支持向所有联系人发送消息
  - 支持向所有群组频道发送消息
  - 支持向所有私聊好友发送消息
  - 支持排除特定频道的广播功能
  - 提供详细的发送统计和日志记录

### 🔧 技术改进

- **广播工具**: 新增 `broadcast.ts` 工具模块，提供完整的广播功能 API
- **模块优化**: 优化 Bilibili 和 MX Space 模块的消息发送逻辑
- **事件处理**: 改进 MX Space 事件处理器的广播支持

### 📚 文档更新

- 更新 MX Space webhook 配置文档，添加广播功能相关说明

## [2.2.2] - 2025-07-22

### ✨ 新增功能

- 🔧 **Axios 错误处理工具**: 新增专门的 axios 错误处理工具，提升 API 请求错误日志的详细性和可读性
- 🌐 **增强 Webhook 处理**: 支持多种签名格式和事件类型，提升 webhook 处理的兼容性和稳定性

### 🔧 技术改进

- **错误日志优化**: 在 Bilibili、GitHub 和 MX Space 模块中集成新的错误处理工具
- **API 请求增强**: 改进各模块的 API 请求错误处理逻辑
- **Webhook 逻辑优化**: 增强 MX Space webhook 处理逻辑，支持更多事件类型
- **测试工具更新**: 更新 webhook 测试脚本，增加更多测试场景

### 📚 文档更新

- 更新 MX Space webhook 配置文档，添加更多配置示例和说明

## [2.2.0] - 2025-07-22

### ✨ 新增功能

- 🔧 **Webhook 调试功能**: 添加了专门的 webhook 调试工具和调试页面
- 📚 **Webhook 配置文档**: 新增 MX Space webhook 配置完整文档和示例
- 🧹 **HTML 内容清理**: 添加 sanitize-html 依赖，优化 HTML 标签清理功能
- 🌐 **用户代理更新**: 更新 MX Space API 请求的用户代理头，提升兼容性

### 🔧 技术改进

- **依赖更新**: 添加 `sanitize-html` 依赖用于安全的 HTML 处理
- **类型定义**: 更新 sanitize-html 相关类型定义
- **API 优化**: 改进 MX Space API 客户端的请求处理逻辑
- **Webhook 处理**: 增强 webhook 事件处理逻辑和错误处理

### 📚 文档更新

- 新增 `docs/mx-space-webhook-setup.md` - MX Space Webhook 配置指南
- 新增 `docs/webhook-config-example.yml` - Webhook 配置示例文件
- 新增 `scripts/test-webhook.sh` - Webhook 测试脚本

### 🐛 修复

- 优化 HTML 标签清理函数，提供更安全的内容处理
- 改进 webhook 处理逻辑的稳定性和错误处理

## [2.1.1] - 2025-07-22

### Dependencies

- @koishijs/plugin-server: 3.2.7

## [2.1.0] - 2025-07-22

### 新增功能

- 新成员欢迎功能
- 评论回复功能
- MX Space Webhook 事件处理
- 更新的依赖项和优化的API客户端

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
