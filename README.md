# koishi-plugin-imx

这是一个将 IMX Bot 功能移植到 Koishi 平台的插件。

## 功能特性

### 🔄 复读机
- 自动检测连续重复的消息并进行复读
- 支持复读打断机制

### 🛠️ 工具命令
- `tool.ip <ip>` - 查询 IP 地址信息
- `tool.base64 <text>` - Base64 编码/解码（使用 `-d` 参数解码）
- `tool.md5 <text>` - 计算 MD5 哈希值

### 🌸 MX Space 集成
- 支持 MX Space API 集成
- 自动早安/晚安问候（可配置时间）
- 新成员加入欢迎
- `hitokoto` - 获取一言

### 🤖 OpenAI 集成
- `ask <message>` - 询问 AI
- `chat <message>` - AI 对话（支持上下文）
- `chat reset` - 重置对话上下文
- 支持 @ 机器人进行对话

### 📺 Bilibili 直播监控
- 监控指定 B站直播间开播状态
- 开播时自动推送通知到指定频道
- `bili.status` - 查看当前直播状态

### 🐙 GitHub Webhook
- 支持 GitHub 事件推送通知
- 监控 Push、Issue、Pull Request 事件
- `github.test` - 测试 GitHub 通知功能

### 🏥 健康检查
- `health` - 查看系统健康状态
- 监控内存使用、运行时间等信息

## 安装

```bash
npm install koishi-plugin-imx
```

或者

```bash
yarn add koishi-plugin-imx
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
      watchChannels: ["channel-id-1", "channel-id-2"]
      enableGreeting: true
    
    # OpenAI 配置
    openai:
      apiKey: "your-openai-api-key"
      model: "gpt-3.5-turbo"
      temperature: 0.6
    
    # Bilibili 配置
    bilibili:
      enabled: true
      liveRoomId: "123456"
      watchChannels: ["channel-id"]
      checkInterval: 60000
      atAll: false
    
    # GitHub 配置
    github:
      enabled: true
      webhookSecret: "your-webhook-secret"
      webhookPort: 3000
      watchChannels: ["channel-id"]
    
    # 健康检查配置
    healthCheck:
      enabled: true
      interval: 300000
    
    # 错误通知配置
    errorNotify:
      enabled: true
```

## 配置说明

### MX Space 配置
- `baseUrl`: MX Space API 地址
- `token`: API 访问令牌
- `watchChannels`: 监听的频道ID列表
- `enableGreeting`: 是否启用自动问候功能

### OpenAI 配置
- `apiKey`: OpenAI API 密钥（必需）
- `model`: 使用的模型，默认为 `gpt-3.5-turbo`
- `temperature`: 温度参数，控制回复的随机性

### Bilibili 配置
- `enabled`: 是否启用 Bilibili 监控
- `liveRoomId`: 要监控的直播间ID
- `watchChannels`: 推送通知的频道ID列表
- `checkInterval`: 检查间隔（毫秒）
- `atAll`: 开播时是否 @全体成员

### GitHub 配置
- `enabled`: 是否启用 GitHub Webhook
- `webhookSecret`: GitHub Webhook 密钥
- `webhookPort`: Webhook 监听端口
- `watchChannels`: 推送通知的频道ID列表

## 使用示例

### 工具命令
```
tool.ip 8.8.8.8
tool.base64 Hello World
tool.base64 -d SGVsbG8gV29ybGQ=
tool.md5 Hello World
```

### AI 对话
```
ask 什么是人工智能？
chat 你好
chat 继续之前的话题
chat reset
```

### 其他命令
```
hitokoto
health
bili.status
github.test
```

## 开发

1. 克隆仓库
2. 安装依赖：`npm install`
3. 构建：`npm run build`
4. 开发模式：`npm run dev`

## 从 IMX Bot 迁移

如果你之前使用的是 IMX Bot，可以参考以下迁移步骤：

1. 安装此插件
2. 将原有的配置转换为 Koishi 配置格式
3. 确保所有依赖的服务（如 MX Space、OpenAI 等）配置正确
4. 测试各项功能是否正常工作

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！