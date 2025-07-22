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
