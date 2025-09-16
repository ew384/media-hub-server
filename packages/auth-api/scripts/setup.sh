#!/bin/bash
# scripts/setup.sh - 项目初始化脚本

set -e

echo "🚀 开始初始化认证服务项目..."

# 检查 Node.js 版本
node_version=$(node -v)
echo "Node.js版本: $node_version"

if [[ $node_version < "v16" ]]; then
    echo "❌ 需要 Node.js 16 或更高版本"
    exit 1
fi

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 创建环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ 请编辑 .env 文件配置您的环境变量"
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 启动 Docker 服务
echo "🐳 启动 Docker 服务..."
docker-compose up -d postgres redis

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
npx prisma migrate dev --name init

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npx prisma generate

echo "✅ 项目初始化完成！"
echo ""
echo "🎯 接下来的步骤："
echo "1. 编辑 .env 文件配置阿里云短信服务"
echo "2. 运行 npm run start:dev 启动开发服务器"
echo "3. 访问 http://localhost:3000/api/docs 查看 API 文档"

# scripts/start.sh - 开发环境启动脚本
#!/bin/bash

set -e

echo "🚀 启动开发环境..."

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "❌ .env 文件不存在，请运行 ./scripts/setup.sh"
    exit 1
fi

# 启动 Docker 服务
echo "🐳 启动依赖服务..."
docker-compose up -d postgres redis

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查数据库连接
echo "🔍 检查数据库连接..."
npx prisma db push

# 启动开发服务器
echo "🎯 启动开发服务器..."
npm run start:dev

# scripts/deploy.sh - 生产环境部署脚本
#!/bin/bash

set -e

echo "🚀 部署到生产环境..."

# 检查环境变量
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

# 构建应用
echo "📦 构建应用..."
npm run build

# 运行数据库迁移
echo "🗄️ 运行生产环境数据库迁移..."
npx prisma migrate deploy

# 启动所有服务
echo "🐳 启动所有服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动完成..."
sleep 30

# 健康检查
echo "🔍 执行健康检查..."
health_check=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health)

if [ $health_check -eq 200 ]; then
    echo "✅ 部署成功！服务运行正常"
else
    echo "❌ 部署失败，健康检查未通过"
    exit 1
fi

echo "🎉 部署完成！"
echo "📚 API文档地址: http://localhost/api/docs"

# scripts/test.sh - 测试脚本
#!/bin/bash

set -e

echo "🧪 运行测试..."

# 设置测试环境
export NODE_ENV=test
export DATABASE_URL="postgresql://auth_user:auth_password@localhost:5433/auth_test_db"

# 启动测试数据库
echo "🐳 启动测试数据库..."
docker run --name test-postgres -e POSTGRES_USER=auth_user -e POSTGRES_PASSWORD=auth_password -e POSTGRES_DB=auth_test_db -p 5433:5432 -d postgres:15-alpine

# 等待数据库启动
sleep 10

# 运行数据库迁移
echo "🗄️ 运行测试数据库迁移..."
npx prisma migrate deploy

# 运行单元测试
echo "🧪 运行单元测试..."
npm run test

# 运行端到端测试
echo "🔄 运行端到端测试..."
npm run test:e2e

# 清理测试环境
echo "🧹 清理测试环境..."
docker stop test-postgres
docker rm test-postgres

echo "✅ 测试完成！"

# scripts/cleanup.sh - 清理脚本
#!/bin/bash

set -e

echo "🧹 清理项目环境..."

# 停止所有容器
echo "🛑 停止所有容器..."
docker-compose down

# 清理Docker资源
echo "🗑️ 清理Docker资源..."
docker system prune -f

# 清理node_modules (可选)
read -p "是否删除 node_modules? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ 删除 node_modules..."
    rm -rf node_modules
fi

# 清理构建文件
echo "🗑️ 清理构建文件..."
rm -rf dist

echo "✅ 清理完成！"

# package.json 中添加的脚本
# "scripts": {
#   "setup": "chmod +x scripts/*.sh && ./scripts/setup.sh",
#   "dev": "./scripts/start.sh",
#   "deploy": "./scripts/deploy.sh",
#   "test:full": "./scripts/test.sh",
#   "cleanup": "./scripts/cleanup.sh"
# }