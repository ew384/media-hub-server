#!/bin/bash

# 修复后的 Auth API 测试脚本
# 验证响应格式修复和频率限制是否正常工作
# 使用方法: chmod +x fixed_auth_test.sh && ./fixed_auth_test.sh

# =============================================================================
# 配置区域
# =============================================================================
BASE_URL="http://localhost:3100/api/v1"
TEST_EMAIL="test_fixed_$(date +%s)@example.com"
TEST_PASSWORD="Password123!"
TEST_USERNAME="修复测试用户$(date +%H%M)"
TEST_PHONE="13800138000"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 全局变量
ACCESS_TOKEN=""
REFRESH_TOKEN=""

# =============================================================================
# 工具函数
# =============================================================================

print_header() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "\n${CYAN}🧪 测试: $1${NC}"
    echo -e "${BLUE}   请求: $2 $3${NC}"
}

print_success() {
    echo -e "${GREEN}   ✅ $1${NC}"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_fail() {
    echo -e "${RED}   ❌ $1${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_info() {
    echo -e "${BLUE}   ℹ️  $1${NC}"
}

# 执行API请求
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method \"$BASE_URL$endpoint\""
    curl_cmd="$curl_cmd -H \"Content-Type: application/json\""
    
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    eval $curl_cmd
}

# =============================================================================
# 测试用例
# =============================================================================

test_health_check() {
    print_header "1. 健康检查测试"
    
    print_test "健康检查接口" "GET" "/health"
    local result=$(api_call "GET" "/health")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_success "健康检查通过 - 包装格式正确"
    else
        print_fail "健康检查失败"
    fi
}

test_sms_interfaces() {
    print_header "2. 短信接口测试"
    
    # 测试验证无效验证码
    print_test "验证无效验证码" "POST" "/sms/verify"
    local verify_data='{"phone":"'$TEST_PHONE'","code":"000000","scene":"register"}'
    local result=$(api_call "POST" "/sms/verify" "$verify_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    # 检查是否是包装格式且valid为false
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200 and .data.valid == false' > /dev/null; then
        print_success "验证码验证接口正常 - 包装格式，valid=false"
    else
        print_fail "验证码验证接口异常"
    fi
    
    # 测试发送验证码（预期失败但检查错误格式）
    print_test "发送验证码(预期失败)" "POST" "/sms/send"
    local send_data='{"phone":"'$TEST_PHONE'","scene":"register"}'
    local result=$(api_call "POST" "/sms/send" "$send_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "500" ] && echo "$response" | jq -e '.code == 500' > /dev/null; then
        print_success "短信发送失败符合预期 - 错误格式正确"
    else
        print_fail "短信发送错误格式不正确"
    fi
}

test_registration() {
    print_header "3. 用户注册测试 - 检查响应格式修复"
    
    print_test "邮箱注册" "POST" "/auth/register"
    local reg_data='{
        "type": "email",
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "username": "'$TEST_USERNAME'"
    }'
    
    local result=$(api_call "POST" "/auth/register" "$reg_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    # 检查是否是直接格式（不包装）
    if [ "$http_code" = "201" ] && echo "$response" | jq -e '. | has("user") and has("accessToken") and has("refreshToken")' > /dev/null; then
        print_success "注册成功 - 直接格式正确（符合文档）"
        
        # 提取token
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken')
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken')
        
        print_info "Access Token: ${ACCESS_TOKEN:0:50}..."
        print_info "Refresh Token: ${REFRESH_TOKEN:0:36}..."
        
        # 验证用户信息格式
        local user_info=$(echo "$response" | jq '.user')
        if echo "$user_info" | jq -e '. | has("id") and has("username") and has("email")' > /dev/null; then
            print_success "用户信息格式完整"
        else
            print_fail "用户信息格式不完整"
        fi
        
    elif [ "$http_code" = "201" ] && echo "$response" | jq -e '.code == 200 and .data' > /dev/null; then
        print_fail "注册成功但仍是包装格式（未修复）"
    else
        print_fail "注册失败"
        echo "$response"
    fi
}

test_login() {
    print_header "4. 用户登录测试 - 检查响应格式修复"
    
    print_test "邮箱登录" "POST" "/auth/login"
    local login_data='{
        "type": "email",
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'"
    }'
    
    local result=$(api_call "POST" "/auth/login" "$login_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    # 检查是否是直接格式
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '. | has("user") and has("accessToken") and has("refreshToken")' > /dev/null; then
        print_success "登录成功 - 直接格式正确（符合文档）"
        
        # 更新token
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken')
        REFRESH_TOKEN=$(echo "$response" | jq -r '.refreshToken')
        
    elif [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_fail "登录成功但仍是包装格式（未修复）"
    else
        print_fail "登录失败"
    fi
}

test_authenticated_endpoints() {
    print_header "5. 认证接口测试 - 检查响应格式修复"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_fail "没有有效Token，跳过认证测试"
        return
    fi
    
    # 测试获取用户资料
    print_test "获取用户资料" "GET" "/auth/profile"
    local result=$(api_call "GET" "/auth/profile" "" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    # 检查是否是直接格式
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '. | has("id") and has("username")' > /dev/null; then
        print_success "获取资料成功 - 直接格式正确"
    elif [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_fail "获取资料成功但仍是包装格式（未修复）"
    else
        print_fail "获取用户资料失败"
    fi
    
    # 测试更新用户资料
    print_test "更新用户资料" "PUT" "/auth/profile"
    local update_data='{"username":"'$TEST_USERNAME'更新版"}'
    local result=$(api_call "PUT" "/auth/profile" "$update_data" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '. | has("id") and has("username")' > /dev/null; then
        print_success "更新资料成功 - 直接格式正确"
    elif [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_fail "更新资料成功但仍是包装格式（未修复）"
    else
        print_fail "更新用户资料失败"
    fi
    
    # 测试users模块的接口
    print_test "获取用户资料(/users)" "GET" "/users/profile"
    local result=$(api_call "GET" "/users/profile" "" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '. | has("id") and has("username")' > /dev/null; then
        print_success "Users模块资料获取 - 直接格式正确"
    elif [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_fail "Users模块成功但仍是包装格式（未修复）"
    else
        print_fail "Users模块资料获取失败"
    fi
}

test_token_operations() {
    print_header "6. Token操作测试"
    
    if [ -z "$REFRESH_TOKEN" ]; then
        print_fail "没有有效Refresh Token，跳过Token测试"
        return
    fi
    
    # 测试刷新Token
    print_test "刷新Token" "POST" "/auth/refresh"
    local refresh_data='{"refreshToken":"'$REFRESH_TOKEN'"}'
    local result=$(api_call "POST" "/auth/refresh" "$refresh_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    echo "$response" | jq '.'
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ] && echo "$response" | jq -e '. | has("accessToken") and has("refreshToken")' > /dev/null; then
        print_success "Token刷新成功 - 直接格式正确"
    elif [ "$http_code" = "200" ] && echo "$response" | jq -e '.code == 200' > /dev/null; then
        print_fail "Token刷新成功但仍是包装格式（未修复）"
    else
        print_fail "Token刷新失败"
    fi
    
    # 测试退出登录
    print_test "用户退出" "POST" "/auth/logout"
    local logout_data='{"refreshToken":"'$REFRESH_TOKEN'"}'
    local result=$(api_call "POST" "/auth/logout" "$logout_data" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "204" ]; then
        print_success "退出登录成功 - 状态码正确"
    else
        print_fail "退出登录失败"
    fi
}

test_rate_limiting() {
    print_header "7. 频率限制测试 - 检查是否修复"
    
    print_info "测试注册频率限制（1分钟最多3次）"
    
    # 快速连续注册4次，第4次应该失败
    for i in {1..4}; do
        local test_email="rate_test_$i@example.com"
        local reg_data='{
            "type": "email",
            "email": "'$test_email'",
            "password": "'$TEST_PASSWORD'",
            "username": "频率测试'$i'"
        }'
        
        print_test "频率测试 $i/4" "POST" "/auth/register"
        local result=$(api_call "POST" "/auth/register" "$reg_data")
        local response=$(echo "$result" | head -n -1)
        local http_code=$(echo "$result" | tail -n 1)
        
        print_info "HTTP状态码: $http_code"
        
        if [ $i -le 3 ]; then
            if [ "$http_code" = "201" ]; then
                print_success "第$i次注册成功（在限制内）"
            else
                print_fail "第$i次注册失败（应该成功）"
                echo "$response" | jq '.'
            fi
        else
            if [ "$http_code" = "429" ]; then
                print_success "第$i次注册被限制（频率限制生效）"
                echo "$response" | jq '.'
            else
                print_fail "第$i次注册未被限制（频率限制未生效）"
                echo "$response" | jq '.'
            fi
        fi
        
        # 短暂延迟
        sleep 0.5
    done
}

test_error_handling() {
    print_header "8. 错误处理测试"
    
    # 测试未认证访问
    print_test "未认证访问" "GET" "/auth/profile"
    local result=$(api_call "GET" "/auth/profile")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "401" ] && echo "$response" | jq -e '.code == 401' > /dev/null; then
        print_success "未认证访问被正确拒绝 - 包装格式正确"
    else
        print_fail "未认证访问处理不正确"
    fi
    
    # 测试参数错误
    print_test "参数错误测试" "POST" "/auth/login"
    local bad_data='{"type":"invalid"}'
    local result=$(api_call "POST" "/auth/login" "$bad_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "400" ] && echo "$response" | jq -e '.code == 400' > /dev/null; then
        print_success "参数错误被正确处理 - 包装格式正确"
    else
        print_fail "参数错误处理不正确"
    fi
}

# =============================================================================
# 主测试流程
# =============================================================================

main() {
    echo -e "${PURPLE}"
    echo "🚀 修复后的 Auth API 测试"
    echo "📋 验证目标:"
    echo "   ✓ 认证接口返回直接格式（不包装）"
    echo "   ✓ 其他接口返回包装格式"
    echo "   ✓ 频率限制正常工作"
    echo "   ✓ 错误处理格式正确"
    echo "🌐 测试地址: $BASE_URL"
    echo "📧 测试邮箱: $TEST_EMAIL"
    echo -e "${NC}"
    
    # 检查服务连接
    if ! curl -s --connect-timeout 5 "$BASE_URL/health" > /dev/null; then
        echo -e "${RED}❌ 无法连接到服务器 $BASE_URL${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 服务器连接正常${NC}"
    
    # 执行测试套件
    test_health_check
    test_sms_interfaces
    test_registration
    test_login
    test_authenticated_endpoints
    test_token_operations
    test_rate_limiting
    test_error_handling
    
    # 测试总结
    print_header "🏁 测试总结"
    
    echo -e "${GREEN}✅ 通过测试: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ 失败测试: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📊 总计测试: $TOTAL_TESTS${NC}"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    fi
    
    echo -e "${CYAN}📈 成功率: $success_rate%${NC}"
    
    # 关键指标检查
    echo -e "\n${YELLOW}🔍 关键修复检查:${NC}"
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo -e "${GREEN}✅ 认证流程完整 - 可获取Token${NC}"
    else
        echo -e "${RED}❌ 认证流程不完整 - 无法获取Token${NC}"
    fi
    
    echo -e "\n${BLUE}📝 修复验证说明:${NC}"
    echo -e "${BLUE}• 认证接口应返回直接格式（user, accessToken, refreshToken）${NC}"
    echo -e "${BLUE}• 其他接口应返回包装格式（code, message, data, timestamp）${NC}"
    echo -e "${BLUE}• 频率限制应在第4次注册时生效（HTTP 429）${NC}"
    echo -e "${BLUE}• 如果以上都正确，说明修复成功，可以对接阿里云短信${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 所有测试通过！API修复成功！${NC}"
        echo -e "${GREEN}✅ 可以开始对接阿里云短信服务${NC}"
    else
        echo -e "\n${YELLOW}⚠️  有 $FAILED_TESTS 个测试失败，请检查修复${NC}"
    fi
}

# 检查依赖
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ 需要安装 jq: sudo apt install jq 或 brew install jq${NC}"
    exit 1
fi

# 运行测试
main "$@"