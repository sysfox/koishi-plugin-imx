#!/bin/bash

# Webhook 测试脚本
# 使用 curl 模拟 mx-space 发送不同类型的 webhook 请求

# 用户输入连接相关信息
echo "请输入 Koishi 服务器地址 (默认: http://localhost:5140):"
read -r KOISHI_URL
KOISHI_URL="${KOISHI_URL:-http://localhost:5140}"
echo "请输入 Webhook 路径 (默认: /mx-space/webhook):"
read -r WEBHOOK_PATH
WEBHOOK_PATH="${WEBHOOK_PATH:-/mx-space/webhook}"
echo "请输入 Webhook 密钥 (默认: your-webhook-secret):"
read -r SECRET
SECRET="${SECRET:-your-webhook-secret}"

# 输出确认信息
echo -e "即将执行 Webhook 测试..."
echo -e "目标地址: ${KOISHI_URL}${WEBHOOK_PATH}"
echo -e "密钥: ${SECRET}"


# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== MX-Space Webhook 测试工具 ===${NC}"
echo -e "目标地址: ${KOISHI_URL}${WEBHOOK_PATH}"
echo -e "密钥: ${SECRET}"
echo ""

# 函数：计算 HMAC-SHA256 签名
calculate_signature() {
    local payload="$1"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p | tr -d '\n'
}

# 函数：发送测试请求
send_test_request() {
    local test_name="$1"
    local payload="$2"
    local signature=""
    
    if [ -n "$SECRET" ]; then
        signature="sha256=$(calculate_signature "$payload")"
    fi
    
    echo -e "${YELLOW}测试: ${test_name}${NC}"
    echo -e "请求数据: ${payload}"
    
    if [ -n "$signature" ]; then
        echo -e "签名: ${signature}"
    fi
    
    echo -e "${BLUE}发送请求...${NC}"
    
    # 发送请求并捕获响应
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
        -X POST "${KOISHI_URL}${WEBHOOK_PATH}" \
        -H "Content-Type: application/json" \
        ${signature:+-H "X-Hub-Signature-256: $signature"} \
        -d "$payload")
    
    # 解析响应
    body=$(echo "$response" | sed '/^HTTP_CODE:/,$d')
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    time_total=$(echo "$response" | grep "TIME:" | cut -d: -f2)
    
    echo -e "响应码: ${http_code}"
    echo -e "响应时间: ${time_total}s"
    echo -e "响应内容: ${body}"
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
    fi
    
    echo -e "----------------------------------------"
}

# 测试1: 基本连通性测试
echo -e "${BLUE}1. 基本连通性测试${NC}"
curl_output=$(curl -s -o /dev/null -w "%{http_code}" "${KOISHI_URL}${WEBHOOK_PATH}")
if [ "$curl_output" != "000" ]; then
    echo -e "${GREEN}✓ 服务器可达${NC}"
else
    echo -e "${RED}✗ 服务器不可达，请检查 Koishi 是否运行在 ${KOISHI_URL}${NC}"
    exit 1
fi
echo ""

# 测试2: 错误的请求格式
echo -e "${BLUE}2. 错误请求格式测试${NC}"
send_test_request "空请求体" "{}"
send_test_request "缺少 type" '{"data": {"title": "test"}}'
send_test_request "缺少 data" '{"type": "POST_CREATE"}'

# 测试3: 正确的请求格式
echo -e "${BLUE}3. 正确请求格式测试${NC}"

# POST_CREATE 事件
POST_CREATE_PAYLOAD='{
  "type": "POST_CREATE",
  "data": {
    "id": "test-123",
    "title": "测试文章",
    "text": "这是一篇测试文章的内容，用于验证 webhook 功能是否正常工作。",
    "summary": "测试文章摘要",
    "slug": "test-post",
    "created": "2025-07-22T10:00:00.000Z",
    "category": {
      "id": "cat-123",
      "name": "技术",
      "slug": "tech"
    }
  }
}'

send_test_request "POST_CREATE 事件" "$POST_CREATE_PAYLOAD"

# NOTE_CREATE 事件
NOTE_CREATE_PAYLOAD='{
  "type": "NOTE_CREATE",
  "data": {
    "id": "note-123",
    "title": "测试日记",
    "text": "今天天气不错，写了一些代码测试 webhook 功能。",
    "nid": 123,
    "created": "2025-07-22T10:00:00.000Z",
    "mood": "开心",
    "weather": "晴天",
    "hide": false,
    "password": null,
    "images": []
  }
}'

send_test_request "NOTE_CREATE 事件" "$NOTE_CREATE_PAYLOAD"

# COMMENT_CREATE 事件
COMMENT_CREATE_PAYLOAD='{
  "type": "COMMENT_CREATE",
  "data": {
    "id": "comment-123",
    "author": "测试用户",
    "text": "这是一条测试评论",
    "refType": "Post",
    "isWhispers": false,
    "parent": null,
    "created": "2025-07-22T10:00:00.000Z"
  }
}'

send_test_request "COMMENT_CREATE 事件" "$COMMENT_CREATE_PAYLOAD"

# 测试4: 签名验证测试（如果配置了密钥）
if [ -n "$SECRET" ] && [ "$SECRET" != "your-webhook-secret" ]; then
    echo -e "${BLUE}4. 签名验证测试${NC}"
    
    # 错误签名测试
    echo -e "${YELLOW}测试: 错误签名${NC}"
    curl_response=$(curl -s -w "%{http_code}" \
        -X POST "${KOISHI_URL}${WEBHOOK_PATH}" \
        -H "Content-Type: application/json" \
        -H "X-Hub-Signature-256: sha256=invalid_signature" \
        -d "$POST_CREATE_PAYLOAD")
    
    echo -e "响应码: ${curl_response: -3}"
    if [ "${curl_response: -3}" = "401" ]; then
        echo -e "${GREEN}✓ 签名验证正常工作${NC}"
    else
        echo -e "${RED}✗ 签名验证可能有问题${NC}"
    fi
    echo ""
fi

echo -e "${BLUE}=== 测试完成 ===${NC}"
echo ""
echo -e "${YELLOW}故障排除提示:${NC}"
echo -e "1. 如果所有测试都返回 400，检查 Koishi 日志中的详细错误信息"
echo -e "2. 如果返回 401，检查签名配置是否正确"
echo -e "3. 如果返回 500，检查 Koishi 插件是否正确加载"
echo -e "4. 如果连接超时，检查网络和端口配置"
echo ""
echo -e "要查看详细日志，在 Koishi 配置中设置:"
echo -e "logger:"
echo -e "  levels:"
echo -e "    mx-space: 3  # debug 级别"
