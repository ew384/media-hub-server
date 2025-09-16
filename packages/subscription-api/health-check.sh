#!/bin/bash

# 检查应用健康状态
check_health() {
    local url=$1
    local service=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ $response -eq 200 ]; then
        echo "✅ $service is healthy"
        return 0
    else
        echo "❌ $service is unhealthy (HTTP $response)"
        return 1
    fi
}

echo "🔍 开始健康检查..."

# 检查主应用
check_health "http://localhost:3000/api/health" "主应用"

# 检查数据库连接
check_health "http://localhost:3000/api/health/db" "数据库连接"

# 检查Redis连接
check_health "http://localhost:3000/api/health/redis" "Redis连接"

# 检查关键API端点
check_health "http://localhost:3000/subscription/plans" "订阅API"

echo "🏁 健康检查完成"
