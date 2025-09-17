#!/bin/bash
# subscription-api-complete-test.sh - 完整测试脚本

BASE_URL="http://localhost:3101"
AUTH_BASE_URL="http://localhost:3171"
CONTENT_TYPE="Content-Type: application/json"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Subscription API 完整测试 ===${NC}"

# 测试函数
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local auth_header=$5
    
    echo -e "\n${YELLOW}测试: ${description}${NC}"
    echo "请求: $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "数据: $data"
    fi
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -X $method "$endpoint" \
            -H "$CONTENT_TYPE" \
            -H "$auth_header" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}")
    else
        response=$(curl -s -X $method "$endpoint" \
            -H "$CONTENT_TYPE" \
            -d "$data" \
            -w "\nHTTP_CODE:%{http_code}")
    fi
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
        echo "响应: $(echo "$body" | jq -C '.' 2>/dev/null || echo "$body")"
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "错误: $(echo "$body" | jq -C '.message // .' 2>/dev/null || echo "$body")"
    fi
}

# 1. 先创建测试用户并获取token
echo -e "\n${YELLOW}=== 1. 用户认证准备 ===${NC}"

# 注册测试用户
REGISTER_DATA='{
  "type": "phone",
  "phone": "13800138000",
  "password": "Test123456",
  "username": "testuser"
}'

echo "注册测试用户..."
test_api "POST" "$AUTH_BASE_URL/api/v1/auth/register" "$REGISTER_DATA" "注册测试用户"

# 登录获取token
LOGIN_DATA='{
  "type": "phone",
  "phone": "13800138000",
  "password": "Test123456"
}'

echo -e "\n登录获取Token..."
login_response=$(curl -s -X POST "$AUTH_BASE_URL/api/v1/auth/login" \
    -H "$CONTENT_TYPE" \
    -d "$LOGIN_DATA")

TOKEN=$(echo "$login_response" | jq -r '.data.access_token // .accessToken // .token // empty' 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ Token获取成功${NC}"
    echo "Token: ${TOKEN:0:50}..."
    AUTH_HEADER="Authorization: Bearer $TOKEN"
else
    echo -e "${RED}✗ Token获取失败${NC}"
    echo "登录响应: $login_response"
    echo -e "${YELLOW}将使用无认证模式测试...${NC}"
    AUTH_HEADER=""
fi

# 2. 测试 Subscription API
echo -e "\n${YELLOW}=== 2. Subscription API 测试 ===${NC}"

# 公开接口测试
test_api "GET" "$BASE_URL/subscription/plans" "" "获取会员套餐列表（公开接口）"

if [ -n "$AUTH_HEADER" ]; then
    # 认证接口测试
    test_api "GET" "$BASE_URL/subscription/status" "" "获取用户订阅状态" "$AUTH_HEADER"
    test_api "GET" "$BASE_URL/subscription/history" "" "获取订阅历史" "$AUTH_HEADER"
    
    # 预览测试
    PREVIEW_DATA='{
      "planId": "monthly",
      "startDate": "'$(date -d "+1 day" +%Y-%m-%d)'"
    }'
    test_api "POST" "$BASE_URL/subscription/preview" "$PREVIEW_DATA" "预览订阅套餐" "$AUTH_HEADER"
    
    # 创建订阅测试
    CREATE_DATA='{
      "planId": "monthly", 
      "paidPrice": 99.00,
      "autoRenew": false
    }'
    test_api "POST" "$BASE_URL/subscription" "$CREATE_DATA" "创建订阅" "$AUTH_HEADER"
    
    # 自动续费管理测试
    test_api "PUT" "$BASE_URL/subscription/cancel-auto-renew" "" "取消自动续费" "$AUTH_HEADER"
    test_api "PUT" "$BASE_URL/subscription/resume-auto-renew" "" "恢复自动续费" "$AUTH_HEADER"
    
else
    echo -e "${YELLOW}跳过认证接口测试（无有效Token）${NC}"
fi

# 3. 测试服务状态
echo -e "\n${YELLOW}=== 3. 服务状态测试 ===${NC}"

# API文档测试
test_api "GET" "$BASE_URL/api/docs" "" "检查Swagger文档"

# 数据库连接测试
echo -e "\n${YELLOW}数据库连接检查${NC}"
echo "检查应用日志，确认Prisma连接状态..."

# Redis连接测试
echo -e "\n${YELLOW}Redis连接检查${NC}"
if redis-cli -p 6380 ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis连接正常 (端口6380)${NC}"
else
    echo -e "${RED}✗ Redis连接失败${NC}"
fi

# 4. 错误处理测试
echo -e "\n${YELLOW}=== 4. 错误处理测试 ===${NC}"

# 无效数据测试
INVALID_DATA='{"planId": "invalid"}'
test_api "POST" "$BASE_URL/subscription/preview" "$INVALID_DATA" "无效套餐ID预览" "$AUTH_HEADER"

# 无认证访问测试
test_api "GET" "$BASE_URL/subscription/status" "" "无认证访问受保护接口"

echo -e "\n${YELLOW}=== 测试完成 ===${NC}"
echo -e "${GREEN}测试总结:${NC}"
echo "1. 公开接口应该都能正常访问"
echo "2. 认证接口需要有效token"
echo "3. 检查应用日志确认数据库连接"
echo "4. 确认Redis在6380端口运行"