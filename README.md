# koishi-plugin-imx

[![npm](https://img.shields.io/npm/v/koishi-plugin-imx)](https://www.npmjs.com/package/koishi-plugin-imx)
[![license](https://img.shields.io/npm/l/koishi-plugin-imx)](https://github.com/sysfox/koishi-plugin-imx/blob/main/LICENSE)

一个功能丰富的 Koishi 聊天机器人插件，集成了 Mix-Space、Bilibili、GitHub 等多种服务，为你的聊天机器人提供强大的功能扩展。

## ✨ 功能特性

### 🌸 MX Space 集成
- **Webhook 事件推送**: 支持博客文章、说说、评论等事件的实时推送
- **定时问候**: 自动早安/晚安问候，支持 cron 表达式自定义时间
- **新成员欢迎**: 自动欢迎新加入群组的成员
- **评论回复**: 支持博客评论的互动回复功能
- **博客数据查询**: 获取博客统计信息和最新动态

### 📺 Bilibili 直播监控
- **多房间监控**: 支持同时监控多个直播间的开播状态
- **智能推送**: 开播时自动推送通知到指定频道
- **状态查询**: `bili.status` 命令查看当前所有监控房间的直播状态
- **广播模式**: 支持向所有联系人广播开播通知

### 🐙 GitHub 集成
- **Webhook 支持**: 监听 GitHub 仓库的各种事件
- **多事件类型**: 支持 Push、Issue、Pull Request、工作流等事件
- **安全验证**: 支持 webhook 签名验证

### 🛠️ 实用工具命令
- **哈希计算**: `tools.md5`、`tools.sha256` - 计算文本哈希值
- **IP 查询**: `tools.ip <ip>` - 查询 IP 地址的详细信息
- **时间戳转换**: `tools.timestamp [timestamp]` - 时间戳与可读时间互转
- **Base64 编解码**: `tools.base64 <encode|decode> <text>` - 文本编解码
- **随机生成**: `tools.random [min] [max]` - 生成指定范围的随机数
- **UUID 生成**: `tools.uuid` - 生成标准 UUID
- **颜色生成**: `tools.color` - 生成随机颜色及其各种格式
- **一言**: `tools.hitokoto` 或 `一言` - 获取随机一言
- **短链接**: `tools.shorturl <url>` - 生成短链接（需配置短链接服务 API Key，未配置时仅提示暂不可用）
- **二维码**: `tools.qrcode <text>` - 生成二维码图片

### 🔄 智能复读机
- **智能触发**: 自动检测连续重复的消息并按概率复读
- **复读打断**: 连续复读到一定次数后自动打断
- **可配置参数**: 支持自定义触发阈值、复读概率、打断阈值

### 🚀 强大的广播系统
- **全局广播**: 支持向所有联系人发送消息
- **精准控制**: 支持排除特定频道的广播功能
- **详细统计**: 提供发送统计和详细日志记录

## 安装

```bash
npm install koishi-plugin-imx
```

或者

```bash
yarn add koishi-plugin-imx
```

也可以使用 pnpm：

```bash
pnpm add koishi-plugin-imx
```

## 配置

在 Koishi 配置文件中添加插件配置：

```yaml
plugins:
  imx:
    # MX Space 配置
    mxSpace:
      baseUrl: "https://your-mx-space-api.com"
      token: "your-mx-space-token"
      webhook:
        secret: "your-webhook-secret"
        path: "/mx-space/webhook"
        watchChannels: ["channel-id-1"]
        broadcastToAll: false
        excludeChannels: []
      greeting:
        enabled: true
        channels: ["channel-id-1", "channel-id-2"]
        morningTime: "0 0 6 * * *"  # 每天早上6点
        eveningTime: "0 0 22 * * *"  # 每天晚上10点
        broadcastToAll: false
        excludeChannels: []
      commands:
        enabled: true
        replyPrefix: "来自 Mix Space 的"
      welcomeNewMember:
        enabled: true
        channels: ["group-channel-id"]
      commentReply:
        enabled: true
        channels: ["channel-id-1"]
    
    # Bilibili 配置
    bilibili:
      enabled: true
      roomIds: [123456, 789012]  # 监控的直播间ID列表（兼容旧字段 roomId：单个直播间ID）
      watchChannels: ["channel-id"]
      checkInterval: 5  # 检查间隔（分钟，1-60，默认 5）
      broadcastToAll: false
      excludeChannels: []
    
    # GitHub 配置
    github:
      enabled: true
      webhook:
        secret: "your-github-webhook-secret"
        path: "/github/webhook"
        watchChannels: ["channel-id"]
        broadcastToAll: false
        excludeChannels: []
    
    # 共享功能配置
    shared:
      errorNotify:
        enabled: true
        channels: ["admin-channel-id"]
      repeater:
        enabled: true
        threshold: 3  # 触发复读的次数（2-10，默认 3）
        chance: 0.5   # 复读概率（0-1，默认 0.5）
        breakThreshold: 12  # 连续复读多少次后打断（5-20，默认 12）
      tools:
        enabled: true
```

## 配置说明

### MX Space 配置

- `baseUrl`: MX Space API 地址（必填）
- `token`: API 访问令牌
- **Webhook 配置**:
  - `secret`: Webhook 验证密钥
  - `path`: Webhook 接收路径
  - `watchChannels`: 接收推送的频道ID列表
  - `broadcastToAll`: 是否广播到所有联系人
  - `excludeChannels`: 广播时排除的频道列表
- **问候功能**:
  - `enabled`: 是否启用自动问候
  - `channels`: 发送问候消息的频道
  - `morningTime`/`eveningTime`: 问候时间（cron 格式）
- **其他功能**: 新成员欢迎、评论回复等

### Bilibili 配置

- `enabled`: 是否启用 Bilibili 监控
- `roomIds`: 要监控的直播间ID列表（支持多个；兼容旧字段 `roomId`：单个直播间ID）
- `watchChannels`: 推送通知的频道ID列表
- `checkInterval`: 检查间隔（分钟，1-60，默认 5）
- `broadcastToAll`: 开播时是否广播到所有联系人
- `excludeChannels`: 广播时排除的频道列表

### GitHub 配置

- `enabled`: 是否启用 GitHub Webhook
- **Webhook 配置**:
  - `secret`: GitHub Webhook 密钥
  - `path`: Webhook 接收路径
  - `watchChannels`: 推送通知的频道ID列表
  - `broadcastToAll`: 是否广播到所有联系人
  - `excludeChannels`: 广播时排除的频道列表

### 共享功能配置

- **错误通知**: 系统错误的通知设置
- **复读机**: 智能复读功能的参数调整
- **工具命令**: 实用工具命令的开关

## 命令使用

### 工具命令

```bash
# 基础工具
tools.md5 hello world          # 计算 MD5 哈希
tools.sha256 hello world       # 计算 SHA256 哈希
tools.ip 8.8.8.8              # 查询 IP 信息
tools.timestamp               # 获取当前时间戳
tools.timestamp 1640995200    # 转换时间戳

# 编码工具
tools.base64 encode hello      # Base64 编码
tools.base64 decode aGVsbG8=   # Base64 解码

# 生成工具
tools.random                  # 生成随机数 (1-100)
tools.random 1 10             # 生成 1-10 的随机数
tools.uuid                    # 生成 UUID
tools.color                   # 生成随机颜色

# 网络工具
tools.hitokoto                # 获取一言
一言                          # 获取一言（别名）
tools.shorturl https://...    # 生成短链接
tools.qrcode hello world      # 生成二维码
```

### 监控命令

```bash
bili.status                   # 查看直播状态
```

## 使用示例

### 工具命令使用

```bash
# IP 查询
tools.ip 8.8.8.8

# 编码解码
tools.base64 encode Hello World
tools.base64 decode SGVsbG8gV29ybGQ=

# 哈希计算
tools.md5 Hello World
tools.sha256 Hello World

# 时间工具
tools.timestamp
tools.timestamp 1640995200

# 随机生成
tools.random 1 100
tools.uuid
tools.color
```

### MX Space 事件推送

当 MX Space 博客有新内容时，插件会自动推送通知：

- 📝 新博客文章发布
- 💭 新说说发布  
- 💬 博客评论更新
- 📊 博客数据统计

### Bilibili 直播监控

支持监控多个直播间，当主播开播时自动推送：

```text
🔴某某主播 开播了！
📺今天直播XXX内容
👥 观看人数: 1234
🔗 链接：https://live.bilibili.com/123456
```

## 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/sysfox/koishi-plugin-imx.git
cd koishi-plugin-imx

# 安装依赖
pnpm install

# 开发模式（自动编译）
pnpm run dev

# 构建
pnpm run build
```

### 项目结构

```text
src/
├── index.ts              # 主入口文件
├── constants/            # 常量定义
├── modules/              # 功能模块
│   ├── mx-space.ts       # MX Space 集成
│   ├── bilibili.ts       # Bilibili 监控
│   └── github.ts         # GitHub 集成
├── shared/               # 共享功能
│   ├── repeater.ts       # 复读机
│   └── commands/         # 命令模块
├── types/                # 类型定义
├── utils/                # 工具函数
└── debug/                # 调试工具
```

## 部署指南

### Webhook 配置

如果你需要使用 MX Space 或 GitHub 的 Webhook 功能，需要：

1. 确保你的 Koishi 实例可以从外网访问
2. 配置正确的 Webhook 路径和密钥
3. 在对应服务中设置 Webhook URL

**MX Space Webhook URL**: `https://your-domain.com/mx-space/webhook`  
**GitHub Webhook URL**: `https://your-domain.com/github/webhook`

### 环境要求

- Node.js 16+
- Koishi 4.15.0+
- 稳定的网络连接（用于 API 请求）

## 常见问题

### Q: 为什么 Bilibili 直播监控不工作？

A: 请检查：

1. 直播间ID是否正确
2. 网络连接是否正常
3. 检查间隔设置是否合理（1-60 分钟，默认 5 分钟）

### Q: MX Space Webhook 没有收到推送？

A: 请确认：

1. MX Space 中的 Webhook URL 配置正确
2. Webhook 密钥匹配
3. Koishi 服务可以从外网访问

### Q: 如何自定义问候时间？

A: 在配置中使用 cron 表达式：

```yaml
morningTime: "0 0 8 * * *"    # 每天早上8点
eveningTime: "0 30 21 * * *"  # 每天晚上9点30分
```

## 版本历史

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新记录。

## 相关链接

- [Koishi 官网](https://koishi.chat)
- [MX Space](https://github.com/mx-space)
- [插件 GitHub 仓库](https://github.com/sysfox/koishi-plugin-imx)

## 许可证

[MIT License](./LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 添加了必要的测试
3. 更新了相关文档
4. 提交信息清晰明确

感谢所有贡献者的支持！