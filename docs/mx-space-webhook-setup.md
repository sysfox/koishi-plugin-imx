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
