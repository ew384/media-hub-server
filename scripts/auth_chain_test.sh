#!/bin/bash

# 完整认证链条测试脚本
# 测试: 前端 -> APIServer -> 各个云端服务

set -e

# 配置
AUTH_API="http://localhost:3100/api/v1"
SUBSCRIPTION_API="http://localhost:3101"
API_SERVER="http://localhost:3409"  # 你的APIServer端口

# 测试数据
TEST_EMAIL="chain_test_$(date +%s)@example.com"
TEST_PASSWORD="Password123!"
TEST_USERNAME="链条测试用户"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔗 开始完整认证链条测试${NC}"
echo -e "${BLUE}测试邮箱: $TEST_EMAIL${NC}"

# 步骤1: 直接注册用户到auth-api
echo -e "\n${YELLOW}步骤1: 直接注册到auth-api${NC}"
REGISTER_RESULT=$(curl -s -X POST "$AUTH_API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"email\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"$TEST_USERNAME\"
  }")

echo "$REGISTER_RESULT" | jq '.'

# 提取token
ACCESS_TOKEN=$(echo "$REGISTER_RESULT" | jq -r '.accessToken // empty')
if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ 注册失败，无法获取token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 注册成功，获取到token: ${ACCESS_TOKEN:0:50}...${NC}"

# 步骤2: 直接测试subscription-api
echo -e "\n${YELLOW}步骤2: 直接测试subscription-api${NC}"
DIRECT_SUB_RESULT=$(curl -s -w '\n%{http_code}' -X GET "$SUBSCRIPTION_API/subscription/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

DIRECT_RESPONSE=$(echo "$DIRECT_SUB_RESULT" | head -n -1)
DIRECT_HTTP_CODE=$(echo "$DIRECT_SUB_RESULT" | tail -n 1)

echo -e "HTTP状态码: $DIRECT_HTTP_CODE"
echo "$DIRECT_RESPONSE" | jq '.' 2>/dev/null || echo "$DIRECT_RESPONSE"

if [ "$DIRECT_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ 直接访问subscription-api成功${NC}"
else
  echo -e "${RED}❌ 直接访问subscription-api失败${NC}"
  echo -e "${RED}这说明subscription-api可能没有正确配置或者JWT密钥不匹配${NC}"
fi

# 步骤3: 通过APIServer代理测试subscription
echo -e "\n${YELLOW}步骤3: 通过APIServer代理测试subscription${NC}"
API_SUB_RESULT=$(curl -s -w '\n%{http_code}' -X GET "$API_SERVER/api/cloud/subscription/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

API_RESPONSE=$(echo "$API_SUB_RESULT" | head -n -1)
API_HTTP_CODE=$(echo "$API_SUB_RESULT" | tail -n 1)

echo -e "HTTP状态码: $API_HTTP_CODE"
echo "$API_RESPONSE" | jq '.' 2>/dev/null || echo "$API_RESPONSE"

if [ "$API_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ 通过APIServer代理访问成功${NC}"
else
  echo -e "${RED}❌ 通过APIServer代理访问失败${NC}"
fi

# 步骤4: 检查JWT密钥配置
echo -e "\n${YELLOW}步骤4: JWT配置检查建议${NC}"
echo -e "${BLUE}请检查以下配置文件中的JWT_SECRET是否一致:${NC}"
echo -e "${BLUE}1. packages/auth-api/.env${NC}" 
echo -e "${BLUE}2. packages/subscription-api/.env${NC}"
echo -e "${BLUE}3. .env (docker根目录)${NC}"

# 步骤5: 测试其他服务
echo -e "\n${YELLOW}步骤5: 测试其他云端服务${NC}"

# 测试支付服务
echo -e "\n测试支付服务:"
PAYMENT_RESULT=$(curl -s -w '\n%{http_code}' -X GET "http://localhost:3102/payment/methods" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

PAYMENT_RESPONSE=$(echo "$PAYMENT_RESULT" | head -n -1)
PAYMENT_HTTP_CODE=$(echo "$PAYMENT_RESULT" | tail -n 1)

echo -e "支付服务状态码: $PAYMENT_HTTP_CODE"
if [ "$PAYMENT_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ 支付服务正常${NC}"
else
  echo -e "${YELLOW}⚠️ 支付服务可能需要检查${NC}"
fi

echo -e "\n${BLUE}🎯 测试总结:${NC}"
echo -e "${BLUE}1. 如果步骤2失败，说明subscription-api的JWT配置有问题${NC}"
echo -e "${BLUE}2. 如果步骤2成功但步骤3失败，说明APIServer代理有问题${NC}"
echo -e "${BLUE}3. 如果都成功，说明认证链条正常，前端需要实现登录获取token${NC}"

# 输出测试账号信息供后续使用
echo -e "\n${GREEN}📝 测试账号信息:${NC}"
echo -e "${GREEN}邮箱: $TEST_EMAIL${NC}"
echo -e "${GREEN}密码: $TEST_PASSWORD${NC}"
echo -e "${GREEN}Token: $ACCESS_TOKEN${NC}"
