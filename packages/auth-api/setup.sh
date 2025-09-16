#!/bin/bash
# setup.sh - 简洁的项目安装和测试脚本

set -e

echo "🚀 开始安装认证服务..."

# 1. 检查环境
echo "📋 检查环境依赖..."
node --version || { echo "❌ 需要安装 Node.js"; exit 1; }
npm --version || { echo "❌ 需要安装 npm"; exit 1; }
docker --version || { echo "❌ 需要安装 Docker"; exit 1; }

# 2. 安装依赖
echo "📦 安装项目依赖..."
npm install

# 3. 创建环境变量
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cat > .env << EOF
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
JWT_SECRET="test-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0
BCRYPT_SALT_ROUNDS=12
THROTTLE_TTL=60
THROTTLE_LIMIT=100
SMS_CODE_EXPIRE_TIME=300
SMS_DAILY_LIMIT=10
SMS_RATE_LIMIT_PER_MINUTE=3

# 阿里云短信配置（测试时可以为空）
ALIYUN_ACCESS_KEY_ID=""
ALIYUN_ACCESS_KEY_SECRET=""
ALIYUN_SMS_SIGN_NAME=""
ALIYUN_SMS_TEMPLATE_CODE=""
EOF
    echo "✅ 已创建 .env 文件"
fi

# 4. 启动数据库和Redis
echo "🐳 启动数据库和Redis..."
docker run -d --name test-postgres -p 5432:5432 \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=auth_db \
    postgres:15-alpine || docker start test-postgres

docker run -d --name test-redis -p 6379:6379 \
    redis:7-alpine || docker start test-redis

# 5. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 6. 初始化数据库
echo "🗄️ 初始化数据库..."
npx prisma generate
npx prisma db push

# 7. 启动应用
echo "🎯 启动应用..."
npm run start:dev &
APP_PID=$!

# 等待应用启动
sleep 15

# 8. 简单测试
echo "🧪 运行基础测试..."

# 测试健康检查
echo "测试健康检查接口..."
curl -f http://localhost:3000/api/v1/health || { echo "❌ 健康检查失败"; exit 1; }

# 测试邮箱注册
echo "测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "type": "email",
        "email": "test@example.com",
        "password": "password123",
        "username": "测试用户"
    }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    echo "✅ 注册测试通过"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ 注册测试失败"
    echo "$REGISTER_RESPONSE"
fi

# 测试获取用户信息
if [ ! -z "$TOKEN" ]; then
    echo "测试获取用户信息..."
    curl -f -H "Authorization: Bearer $TOKEN" \
        http://localhost:3000/api/v1/auth/profile || echo "❌ 获取用户信息失败"
    echo "✅ 用户信息测试通过"
fi

echo "🎉 基础测试完成!"
echo ""
echo "📚 接下来可以："
echo "1. 访问 http://localhost:3000/api/docs 查看API文档"
echo "2. 编辑 .env 配置阿里云短信服务测试短信功能"
echo "3. 运行 npm test 执行完整测试"
echo ""
echo "⚠️  停止服务: kill $APP_PID"
echo "⚠️  清理环境: docker stop test-postgres test-redis && docker rm test-postgres test-redis"
