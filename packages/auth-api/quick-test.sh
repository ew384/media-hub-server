#!/bin/bash
# quick-test.sh - 快速测试主要功能

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 快速功能测试..."

# 1. 健康检查
echo "1. 测试健康检查..."
curl -s "$BASE_URL/health" | grep -q "ok" && echo "✅ 健康检查通过" || echo "❌ 健康检查失败"

# 2. 用户注册
echo "2. 测试用户注册..."
REGISTER_RESULT=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "email",
        "email": "quicktest@example.com",
        "password": "password123",
        "username": "快速测试用户"
    }')

TOKEN=$(echo "$REGISTER_RESULT" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_RESULT" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✅ 注册成功"
else
    echo "❌ 注册失败: $REGISTER_RESULT"
    exit 1
fi

# 3. 用户登录
echo "3. 测试用户登录..."
LOGIN_RESULT=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "email",
        "email": "quicktest@example.com",
        "password": "password123"
    }')

echo "$LOGIN_RESULT" | grep -q "accessToken" && echo "✅ 登录成功" || echo "❌ 登录失败"

# 4. 获取用户信息
echo "4. 测试获取用户信息..."
PROFILE_RESULT=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/auth/profile")
echo "$PROFILE_RESULT" | grep -q "快速测试用户" && echo "✅ 获取用户信息成功" || echo "❌ 获取用户信息失败"

# 5. 更新用户信息
echo "5. 测试更新用户信息..."
UPDATE_RESULT=$(curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE_URL/auth/profile" \
    -d '{"username": "更新后的用户名"}')

echo "$UPDATE_RESULT" | grep -q "更新后的用户名" && echo "✅ 更新用户信息成功" || echo "❌ 更新用户信息失败"

# 6. 刷新Token
echo "6. 测试刷新Token..."
if [ ! -z "$REFRESH_TOKEN" ]; then
    REFRESH_RESULT=$(curl -s -X POST "$BASE_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
    
    echo "$REFRESH_RESULT" | grep -q "accessToken" && echo "✅ 刷新Token成功" || echo "❌ 刷新Token失败"
fi

# 7. 短信发送测试（可选，需要配置阿里云）
echo "7. 测试短信发送（如果配置了阿里云短信）..."
SMS_RESULT=$(curl -s -X POST "$BASE_URL/sms/send" \
    -H "Content-Type: application/json" \
    -d '{
        "phone": "13800138000",
        "scene": "register"
    }')

if echo "$SMS_RESULT" | grep -q "expireTime"; then
    echo "✅ 短信发送成功"
elif echo "$SMS_RESULT" | grep -q "阿里云"; then
    echo "⚠️ 短信发送失败：需要配置阿里云短信服务"
else
    echo "⚠️ 短信发送失败：$SMS_RESULT"
fi

echo ""
echo "🎯 快速测试完成！"
echo "如需测试短信功能，请在 .env 中配置阿里云短信服务参数"
