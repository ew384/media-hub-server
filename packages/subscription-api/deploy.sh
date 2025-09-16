# 部署脚本 deploy.sh
#!/bin/bash

echo "🚀 开始部署会员订阅系统..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "❌ 请先创建 .env 文件"
    exit 1
fi

# 停止现有服务
echo "⏹️  停止现有服务..."
docker-compose down

# 拉取最新代码（如果是Git部署）
echo "📥 拉取最新代码..."
git pull origin main

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose up -d --build

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 运行数据库迁移
echo "📊 运行数据库迁移..."
docker-compose exec app npm run migration:run

# 运行数据播种
echo "🌱 运行数据播种..."
docker-compose exec app npm run seed

# 检查服务状态
echo "✅ 检查服务状态..."
docker-compose ps

# 显示日志
echo "📋 显示应用日志..."
docker-compose logs -f app

echo "🎉 部署完成！"
echo "📖 API文档: http://localhost/api/docs"
echo "📧 邮件测试: http://localhost:8025 (仅开发环境)"
