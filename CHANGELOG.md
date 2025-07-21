# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
