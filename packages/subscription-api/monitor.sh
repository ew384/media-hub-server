#!/bin/bash

echo "📊 系统监控报告 - $(date)"
echo "=================================="

# Docker容器状态
echo "🐳 Docker容器状态:"
docker-compose ps

echo ""

# 数据库连接数
echo "💾 数据库连接:"
docker-compose exec postgres psql -U postgres -d auth_system -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo ""

# Redis内存使用
echo "🔴 Redis内存使用:"
docker-compose exec redis redis-cli info memory | grep used_memory_human

echo ""

# 应用日志错误统计
echo "📝 应用错误日志 (最近1小时):"
docker-compose logs --since 1h app 2>&1 | grep -i error | wc -l

echo ""

# 订阅统计
echo "💳 订阅统计:"
echo "- 活跃订阅数量"
echo "- 即将过期订阅 (7天内)"
echo "- 本月新增订阅"

# 这些统计可以通过API获取或直接查询数据库
