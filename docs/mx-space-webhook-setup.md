# mx-space Webhook 配置说明

## 在 mx-space 后台设置 Webhook

1. 登录 mx-space 管理后台
2. 进入 "设置" -> "Webhook" 页面
3. 添加新的 Webhook 配置：
   - **URL**: `http://your-koishi-server:5140/mx-space/webhook`
   - **Secret**: `your-webhook-secret` (与 Koishi 配置中的 secret 保持一致)
   - **事件类型**: 选择需要推送的事件，如：
     - POST_CREATE (新文章发布)
     - NOTE_CREATE (新随想发布)
     - COMMENT_CREATE (新评论)
     - SAY_CREATE (新说说)
     - RECENTLY_CREATE (新动态)

## Webhook 请求头兼容性

本插件兼容多种 webhook 请求头格式：

### MX Space 格式 (推荐)

MX Space 使用以下请求头：

```http
X-Webhook-Signature: 使用 SHA1 算法生成的签名
X-Webhook-Event: 事件类型 (如 post_create, note_create)
X-Webhook-Id: webhook ID
X-Webhook-Timestamp: 时间戳
X-Webhook-Signature256: 使用 SHA256 算法生成的签名
```

### GitHub 格式 (兼容)

也兼容传统的 GitHub webhook 格式：

```http
X-Hub-Signature-256: sha256=<signature>
```

## 签名验证

插件支持以下签名算法：

- **SHA1**: 使用 `X-Webhook-Signature` 头部
- **SHA256**: 使用 `X-Webhook-Signature256` 或 `X-Hub-Signature-256` 头部

优先级：SHA256 > SHA1，如果两种签名都存在，优先使用 SHA256 进行验证。

## 支持的事件类型

根据 mx-space webhook 规范，支持以下事件：

- `POST_CREATE`: 新文章发布
- `POST_UPDATE`: 文章更新
- `NOTE_CREATE`: 新随想发布
- `NOTE_UPDATE`: 随想更新
- `COMMENT_CREATE`: 新评论
- `SAY_CREATE`: 新说说
- `RECENTLY_CREATE`: 新动态

## 网络配置注意事项

1. 确保 mx-space 服务器能够访问到 Koishi 服务器的 webhook 地址
2. 如果 Koishi 部署在内网，需要：
   - 配置端口转发或反向代理
   - 使用 ngrok 等工具临时暴露端口
   - 部署到有公网 IP 的服务器

## 示例 nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /koishi/ {
        proxy_pass http://localhost:5140/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这样 webhook URL 就可以设置为：`http://your-domain.com/koishi/mx-space/webhook`

## 广播到所有联系人功能

### 启用广播功能

如果你希望 webhook 事件广播到所有联系人（包括群组和私聊），可以在 Koishi 配置中启用 `broadcastToAll` 选项：

```yaml
plugins:
  imx:
    mxSpace:
      baseUrl: "https://your-mx-space-api.com"
      token: "your-mx-space-token"
      webhook:
        secret: "your-webhook-secret"
        path: "/mx-space/webhook"
        broadcastToAll: true
        excludeChannels: ["channel-id-to-exclude"]
```

### 配置选项说明

- `broadcastToAll`: 是否广播到所有联系人
  - `false`（默认）: 只发送到 `watchChannels` 指定的频道
  - `true`: 广播到机器人可访问的所有群组和私聊
- `excludeChannels`: 排除的频道ID列表
  - 当启用 `broadcastToAll` 时，这些频道不会收到广播消息
  - 可以用来排除测试群组或不希望接收通知的频道
- `watchChannels`: 监听的频道ID列表
  - 当 `broadcastToAll` 为 `false` 时，只有这些频道会收到消息

### 问候功能广播

问候功能也支持广播到所有联系人：

```yaml
plugins:
  imx:
    mxSpace:
      greeting:
        enabled: true
        broadcastToAll: true
        excludeChannels: ["channel-id-to-exclude"]
        morningTime: "0 0 6 * * *"
        eveningTime: "0 0 22 * * *"
```

### Bilibili 直播通知广播

Bilibili 直播监控也支持广播功能：

```yaml
plugins:
  imx:
    bilibili:
      enabled: true
      roomIds: [123456]
      broadcastToAll: true
      excludeChannels: ["channel-id-to-exclude"]
```

### 注意事项

1. **性能影响**: 启用广播功能可能会增加消息发送的延迟，特别是当机器人加入了大量群组时
2. **权限要求**: 机器人需要有发送消息的权限才能成功广播
3. **错误处理**: 发送失败的消息会在日志中记录，但不会影响其他消息的发送
4. **排除频道**: 建议将测试群组或不希望接收通知的频道添加到 `excludeChannels` 列表中
