#!/bin/bash

# Auth API 修复版测试脚本
# 使用方法: chmod +x test_api_fixed.sh && ./test_api_fixed.sh

BASE_URL="http://localhost:3171/api/v1"
TEST_PHONE="13800138000"
TEST_EMAIL="test2@example.com"  # 换个邮箱避免重复
TEST_USERNAME="测试用户"
TEST_PASSWORD="password123"

echo "🚀 Auth API 测试开始: $BASE_URL"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果统计
PASS=0
FAIL=0
EXPECTED_FAIL=0

# 改进的测试函数
test_api() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local token="$5"
    local expect_fail="$6"  # 是否预期失败
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    # 构建curl命令
    local curl_cmd="curl -s -X $method \"$url\" -H \"Content-Type: application/json\""
    
    # 添加认证头
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
    fi
    
    # 添加数据
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # 执行请求
    response=$(eval $curl_cmd)
    echo "$response" | jq '.'
    
    # 判断结果
    local is_success=false
    if echo "$response" | jq -e '.code == 200' > /dev/null 2>&1; then
        is_success=true
    fi
    
    if [ "$expect_fail" = "true" ]; then
        if [ "$is_success" = "false" ]; then
            echo -e "${BLUE}✅ EXPECTED FAIL${NC}"
            ((EXPECTED_FAIL++))
        else
            echo -e "${RED}❌ SHOULD FAIL${NC}"
            ((FAIL++))
        fi
    else
        if [ "$is_success" = "true" ]; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((PASS++))
        else
            echo -e "${RED}❌ FAIL${NC}"
            ((FAIL++))
        fi
    fi
    echo "--------------------------------"
}

# 1. 基础接口测试
echo "📋 1. 基础接口测试"
test_api "系统信息" "GET" "$BASE_URL" "" "" "false"
test_api "健康检查" "GET" "$BASE_URL/health" "" "" "false"

# 2. 短信接口测试（预期失败）
echo "📱 2. 短信接口测试"
test_api "发送注册验证码(无阿里云配置)" "POST" "$BASE_URL/sms/send" \
    '{"phone":"'$TEST_PHONE'","scene":"register"}' "" "true"

test_api "验证无效验证码" "POST" "$BASE_URL/sms/verify" \
    '{"phone":"'$TEST_PHONE'","code":"123456","scene":"register"}' "" "false"

# 3. 用户注册测试
echo "📝 3. 用户注册测试"
test_api "手机注册(预期失败-无真实验证码)" "POST" "$BASE_URL/auth/register" \
    '{"type":"phone","phone":"'$TEST_PHONE'","smsCode":"123456","username":"'$TEST_USERNAME'"}' "" "true"

test_api "邮箱注册" "POST" "$BASE_URL/auth/register" \
    '{"type":"email","email":"'$TEST_EMAIL'","password":"'$TEST_PASSWORD'","username":"'$TEST_USERNAME'邮箱V2"}' "" "false"

# 4. 用户登录测试
echo "🔐 4. 用户登录测试"
echo -e "${YELLOW}Testing: 邮箱登录${NC}"

login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"type":"email","email":"'$TEST_EMAIL'","password":"'$TEST_PASSWORD'"}')

echo "邮箱登录响应:"
echo "$login_response" | jq '.'

# 提取token
ACCESS_TOKEN=$(echo "$login_response" | jq -r '.data.accessToken // empty')
REFRESH_TOKEN=$(echo "$login_response" | jq -r '.data.refreshToken // empty')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ] && [ "$ACCESS_TOKEN" != "empty" ]; then
    echo -e "${GREEN}✅ 登录成功，获得token${NC}"
    echo -e "${BLUE}Access Token: ${ACCESS_TOKEN:0:50}...${NC}"
    ((PASS++))
    
    # 5. 需要认证的接口测试
    echo "🔒 5. 认证接口测试"
    test_api "获取用户资料" "GET" "$BASE_URL/auth/profile" "" "$ACCESS_TOKEN" "false"
    
    test_api "更新用户资料" "PUT" "$BASE_URL/auth/profile" \
        '{"username":"更新后的用户名V2","avatarUrl":"https://example.com/avatar.jpg"}' "$ACCESS_TOKEN" "false"
    
    test_api "获取用户资料(users)" "GET" "$BASE_URL/users/profile" "" "$ACCESS_TOKEN" "false"
    
    # 6. Token相关测试
    echo "🔄 6. Token测试"
    if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
        test_api "刷新Token" "POST" "$BASE_URL/auth/refresh" \
            '{"refreshToken":"'$REFRESH_TOKEN'"}' "" "false"
        
        test_api "登出" "POST" "$BASE_URL/auth/logout" \
            '{"refreshToken":"'$REFRESH_TOKEN'"}' "$ACCESS_TOKEN" "false"
    fi
else
    echo -e "${RED}❌ 登录失败，跳过认证接口测试${NC}"
    ((FAIL++))
fi

# 7. 错误情况测试（预期失败）
echo "⚠️  7. 错误情况测试（这些应该失败）"
test_api "无效参数注册" "POST" "$BASE_URL/auth/register" \
    '{"type":"phone","phone":"invalid","username":""}' "" "true"

test_api "无效登录" "POST" "$BASE_URL/auth/login" \
    '{"type":"email","email":"wrong@example.com","password":"wrong"}' "" "true"

test_api "未认证访问" "GET" "$BASE_URL/auth/profile" "" "" "true"

# 8. 额外功能测试
echo "🎯 8. 额外功能测试"
test_api "重复邮箱注册(应该失败)" "POST" "$BASE_URL/auth/register" \
    '{"type":"email","email":"'$TEST_EMAIL'","password":"'$TEST_PASSWORD'","username":"重复用户"}' "" "true"

# 测试总结
echo "================================"
echo "🏁 测试完成"
echo -e "${GREEN}✅ 通过: $PASS${NC}"
echo -e "${RED}❌ 失败: $FAIL${NC}"
echo -e "${BLUE}📋 预期失败: $EXPECTED_FAIL${NC}"
echo "📊 总计: $((PASS + FAIL + EXPECTED_FAIL))"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 所有核心功能测试通过！${NC}"
    echo -e "${BLUE}📝 注意: $EXPECTED_FAIL 个预期失败是正常的（短信配置、错误测试等）${NC}"
else
    echo -e "${YELLOW}⚠️  有 $FAIL 个意外失败，需要检查${NC}"
fi

echo -e "\n${BLUE}💡 提示：${NC}"
echo "- 短信功能需要配置阿里云才能正常工作"
echo "- 错误测试的失败是预期的行为"
echo "- 如果核心认证功能都通过，说明系统运行正常"
