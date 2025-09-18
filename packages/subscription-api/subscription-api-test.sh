#!/bin/bash

# Subscription API 修复版测试脚本
# 针对当前发现的问题进行专项测试
# 使用方法: chmod +x subscription_test_fixed.sh && ./subscription_test_fixed.sh

# =============================================================================
# 配置区域
# =============================================================================
AUTH_BASE_URL="http://localhost:3100/api/v1"  # 使用正确的auth-api端口
SUB_BASE_URL="http://localhost:3101"
TEST_EMAIL="sub_test_$(date +%s)@example.com"
TEST_PASSWORD="Password123!"
TEST_USERNAME="订阅测试用户$(date +%H%M)"

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
USER_ID=""

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
    
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method \"$endpoint\""
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

test_auth_service_integration() {
    print_header "1. 认证服务集成测试"
    
    # 检查auth-api连接
    print_test "检查Auth服务连接" "GET" "$AUTH_BASE_URL/health"
    local result=$(api_call "GET" "$AUTH_BASE_URL/health")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ]; then
        print_success "Auth服务连接正常"
    else
        print_fail "Auth服务连接失败"
        echo "$response"
        return 1
    fi
    
    # 注册测试用户
    print_test "注册测试用户" "POST" "$AUTH_BASE_URL/auth/register"
    local reg_data='{
        "type": "email",
        "email": "'$TEST_EMAIL'",
        "password": "'$TEST_PASSWORD'",
        "username": "'$TEST_USERNAME'"
    }'
    
    local result=$(api_call "POST" "$AUTH_BASE_URL/auth/register" "$reg_data")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "201" ]; then
        # 提取token（直接格式）
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken // empty')
        USER_ID=$(echo "$response" | jq -r '.user.id // empty')
        
        if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
            print_success "用户注册成功，获得Token"
            print_info "Token: ${ACCESS_TOKEN:0:50}..."
            print_info "用户ID: $USER_ID"
        else
            print_fail "注册成功但未获得Token"
        fi
    else
        print_fail "用户注册失败"
        echo "$response"
    fi
}

test_subscription_service_connection() {
    print_header "2. 订阅服务连接测试"
    
    # 检查subscription-api基础连接
    print_test "检查Subscription服务" "GET" "$SUB_BASE_URL"
    local result=$(api_call "GET" "$SUB_BASE_URL")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
        print_success "Subscription服务运行中"
    else
        print_fail "Subscription服务连接失败"
        return 1
    fi
    
    # 测试健康检查（如果有）
    print_test "健康检查" "GET" "$SUB_BASE_URL/health"
    local result=$(api_call "GET" "$SUB_BASE_URL/health")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    if [ "$http_code" = "200" ]; then
        print_success "健康检查通过"
        echo "$response" | jq '.'
    else
        print_info "无健康检查接口或不可访问"
    fi
}

test_public_endpoints() {
    print_header "3. 公开接口测试"
    
    # 测试获取套餐列表
    print_test "获取会员套餐列表" "GET" "$SUB_BASE_URL/subscription/plans"
    local result=$(api_call "GET" "$SUB_BASE_URL/subscription/plans")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "200" ]; then
        # 检查响应格式
        if echo "$response" | jq -e '.code == 200 and .data.plans' > /dev/null; then
            print_success "套餐列表获取成功 - 包装格式正确"
            
            # 验证套餐数据完整性
            local plans_count=$(echo "$response" | jq '.data.plans | length')
            print_info "套餐数量: $plans_count"
            
            if [ "$plans_count" -gt 0 ]; then
                print_success "套餐数据完整"
            else
                print_fail "套餐数据为空"
            fi
        else
            print_fail "套餐列表响应格式不正确"
        fi
    else
        print_fail "套餐列表获取失败"
    fi
}

test_auth_integration() {
    print_header "4. 认证集成测试"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_fail "没有有效Token，跳过认证集成测试"
        return 1
    fi
    
    # 测试获取用户订阅状态
    print_test "获取用户订阅状态" "GET" "$SUB_BASE_URL/subscription/status"
    local result=$(api_call "GET" "$SUB_BASE_URL/subscription/status" "" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "200" ]; then
        print_success "订阅状态获取成功 - 认证集成正常"
        
        # 检查响应格式
        if echo "$response" | jq -e '.code == 200 and .data' > /dev/null; then
            print_success "响应格式正确"
        else
            print_fail "响应格式不正确"
        fi
    elif [ "$http_code" = "401" ]; then
        print_fail "认证失败 - Token可能无效或跨服务认证配置有问题"
        echo "$response"
    else
        print_fail "订阅状态获取失败"
        echo "$response"
    fi
    
    # 测试获取订阅历史
    print_test "获取订阅历史" "GET" "$SUB_BASE_URL/subscription/history"
    local result=$(api_call "GET" "$SUB_BASE_URL/subscription/history" "" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "200" ]; then
        print_success "订阅历史获取成功"
        echo "$response" | jq '.'
    elif [ "$http_code" = "401" ]; then
        print_fail "认证失败"
    else
        print_fail "订阅历史获取失败"
    fi
}

test_subscription_operations() {
    print_header "5. 订阅操作测试"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        print_fail "没有有效Token，跳过订阅操作测试"
        return 1
    fi
    
    # 测试预览订阅
    print_test "预览订阅" "POST" "$SUB_BASE_URL/subscription/preview"
    local preview_data='{
        "planId": "monthly",
        "startDate": "'$(date -d "+1 day" +%Y-%m-%d)'"
    }'
    local result=$(api_call "POST" "$SUB_BASE_URL/subscription/preview" "$preview_data" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "200" ]; then
        print_success "订阅预览成功"
        
        # 检查预览数据完整性
        if echo "$response" | jq -e '.code == 200 and .data.planId and .data.finalPrice' > /dev/null; then
            print_success "预览数据完整"
        else
            print_fail "预览数据不完整"
        fi
    elif [ "$http_code" = "401" ]; then
        print_fail "认证失败"
    else
        print_fail "订阅预览失败"
    fi
    
    # 测试创建订阅
    print_test "创建订阅" "POST" "$SUB_BASE_URL/subscription"
    local create_data='{
        "planId": "monthly",
        "paidPrice": 49.9,
        "autoRenew": false
    }'
    local result=$(api_call "POST" "$SUB_BASE_URL/subscription" "$create_data" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "201" ]; then
        print_success "订阅创建成功"
    elif [ "$http_code" = "401" ]; then
        print_fail "认证失败"
    elif [ "$http_code" = "400" ]; then
        print_info "创建失败 - 可能用户已有订阅（正常情况）"
    else
        print_fail "订阅创建失败"
    fi
}

test_error_handling() {
    print_header "6. 错误处理测试"
    
    # 测试无效套餐ID
    print_test "无效套餐ID预览" "POST" "$SUB_BASE_URL/subscription/preview"
    local invalid_data='{"planId": "invalid_plan"}'
    local result=$(api_call "POST" "$SUB_BASE_URL/subscription/preview" "$invalid_data" "$ACCESS_TOKEN")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    echo "$response" | jq '.'
    
    if [ "$http_code" = "400" ]; then
        print_success "无效参数错误处理正确"
    elif [ "$http_code" = "401" ]; then
        print_fail "认证失败"
    else
        print_fail "错误处理不正确"
    fi
    
    # 测试未认证访问
    print_test "未认证访问保护接口" "GET" "$SUB_BASE_URL/subscription/status"
    local result=$(api_call "GET" "$SUB_BASE_URL/subscription/status")
    local response=$(echo "$result" | head -n -1)
    local http_code=$(echo "$result" | tail -n 1)
    
    print_info "HTTP状态码: $http_code"
    
    if [ "$http_code" = "401" ]; then
        print_success "未认证访问被正确拒绝"
    else
        print_fail "未认证访问处理不正确"
    fi
}

# =============================================================================
# 主测试流程
# =============================================================================

main() {
    echo -e "${PURPLE}"
    echo "🚀 Subscription API 修复版测试"
    echo "📋 测试目标:"
    echo "   ✓ 验证与 Auth API 的集成"
    echo "   ✓ 检查订阅服务基础功能"
    echo "   ✓ 测试认证Token传递"
    echo "   ✓ 验证订阅操作完整性"
    echo "🌐 Auth API: $AUTH_BASE_URL"
    echo "🌐 Subscription API: $SUB_BASE_URL"
    echo "📧 测试邮箱: $TEST_EMAIL"
    echo -e "${NC}"
    
    # 执行测试套件
    test_auth_service_integration
    test_subscription_service_connection
    test_public_endpoints
    test_auth_integration
    test_subscription_operations
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
    
    # 诊断建议
    echo -e "\n${YELLOW}🔧 问题诊断:${NC}"
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}❌ 无法获取认证Token${NC}"
        echo -e "${BLUE}   检查: Auth API 是否在 localhost:3100 运行${NC}"
        echo -e "${BLUE}   检查: 网络连接和端口配置${NC}"
    else
        echo -e "${GREEN}✅ 认证Token获取成功${NC}"
    fi
    
    if [ $FAILED_TESTS -gt 5 ]; then
        echo -e "${RED}❌ 多个认证接口失败${NC}"
        echo -e "${BLUE}   检查: Subscription API 的JWT验证配置${NC}"
        echo -e "${BLUE}   检查: 两个服务的JWT密钥是否一致${NC}"
        echo -e "${BLUE}   检查: 数据库连接状态${NC}"
    fi
    
    echo -e "\n${BLUE}📝 下一步建议:${NC}"
    if [ $success_rate -ge 80 ]; then
        echo -e "${GREEN}✅ 订阅服务基本正常，可以继续对接云服务${NC}"
    else
        echo -e "${YELLOW}⚠️  需要修复认证集成问题后再对接云服务${NC}"
    fi
}

# 检查依赖
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ 需要安装 jq: sudo apt install jq 或 brew install jq${NC}"
    exit 1
fi

# 运行测试
main "$@"
