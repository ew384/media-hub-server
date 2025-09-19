#!/bin/bash
# scripts/docker-manage.sh - Docker管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印函数
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查Docker是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker未运行，请先启动Docker"
        exit 1
    fi
    print_success "Docker运行正常"
}

# 构建所有服务
build_all() {
    print_info "开始构建所有服务..."
    
    # 确保日志目录存在
    mkdir -p logs/{auth,payment,subscription,nginx}
    
    # 构建服务
    docker compose build #--no-cache
    print_success "所有服务构建完成"
}

# 检查基础设施服务状态
check_infra_status() {
    local postgres_running=false
    local redis_running=false
    
    # 检查PostgreSQL
    if docker ps | grep -q "media-hub-postgres"; then
        postgres_running=true
        print_success "PostgreSQL 已运行"
    else
        print_info "PostgreSQL 未运行"
    fi
    
    # 检查Redis  
    if docker ps | grep -q "media-hub-redis"; then
        redis_running=true
        print_success "Redis 已运行"
    else
        print_info "Redis 未运行"
    fi
    
    echo "$postgres_running,$redis_running"
}

# 启动基础设施服务
start_infra() {
    print_info "检查基础设施服务状态..."
    local status=$(check_infra_status)
    local postgres_running=$(echo $status | cut -d',' -f1)
    local redis_running=$(echo $status | cut -d',' -f2)
    
    if [[ "$postgres_running" == "true" && "$redis_running" == "true" ]]; then
        print_success "基础设施服务已在运行，跳过启动"
        return 0
    fi
    
    print_info "启动基础设施服务（数据库、缓存）..."
    docker compose -f docker-compose.dev.yml up -d
    
    # 等待服务启动
    print_info "等待数据库服务就绪..."
    for i in {1..30}; do
        if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_success "数据库已就绪"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "数据库启动超时"
            exit 1
        fi
        sleep 2
    done
    
    print_success "基础设施服务已启动"
}

# 启动应用服务
start_apps() {
    print_info "启动应用服务..."
    docker compose up -d auth-api subscription-api payment-api admin-dashboard
    print_success "应用服务已启动"
    
    # 等待服务就绪
    print_info "等待服务就绪..."
    sleep 10
    
    # 检查服务状态
    check_services
}

# 启动所有服务
start_all() {
    print_info "启动所有服务..."
    start_infra
    sleep 5  # 等待数据库启动
    start_apps
}

# 停止应用服务（保留基础设施）
stop_apps() {
    print_info "停止应用服务（保留数据库）..."
    docker compose stop auth-api subscription-api payment-api admin-dashboard
    print_success "应用服务已停止，数据库继续运行"
}

# 停止基础设施服务
stop_infra() {
    print_info "停止基础设施服务..."
    docker compose -f docker-compose.dev.yml down
    print_success "基础设施服务已停止"
}

# 停止所有服务
stop_all() {
    print_info "停止所有服务..."
    docker compose down
    docker compose -f docker-compose.dev.yml down
    print_success "所有服务已停止"
}

# 重启所有服务
restart_all() {
    print_info "重启所有服务..."
    docker compose restart
    print_success "所有服务已重启"
}

# 查看服务状态
status() {
    print_info "服务运行状态："
    docker compose ps
}

# 查看服务日志
logs() {
    if [ -z "$1" ]; then
        print_info "显示所有服务日志（最后100行）："
        docker compose logs --tail=100 -f
    else
        print_info "显示 $1 服务日志："
        docker compose logs --tail=100 -f "$1"
    fi
}

# 检查服务健康状态
check_services() {
    print_info "检查服务健康状态..."
    
    # 检查数据库
    if curl -f http://localhost:3100/api/v1/health > /dev/null 2>&1; then
        print_success "Auth API (3100) - 正常"
    else
        print_error "Auth API (3100) - 异常"
    fi
    
    if curl -f http://localhost:3101/subscription/plans > /dev/null 2>&1; then
        print_success "Subscription API (3101) - 正常"
    else
        print_error "Subscription API (3101) - 异常"
    fi
    
    if curl -f http://localhost:3102/health > /dev/null 2>&1; then
        print_success "Payment API (3102) - 正常"
    else
        print_error "Payment API (3102) - 异常"
    fi
    
    if curl -f http://localhost:3103 > /dev/null 2>&1; then
        print_success "Admin Dashboard (3103) - 正常"
    else
        print_error "Admin Dashboard (3103) - 异常"
    fi
}

# 运行测试
test_services() {
    print_info "运行服务测试..."
    
    # 确保服务运行
    if ! docker compose ps | grep -q "Up"; then
        print_error "服务未运行，请先启动服务"
        exit 1
    fi
    
    # 运行Auth API测试
    if [ -f "packages/auth-api/auth_api_test.sh" ]; then
        print_info "运行Auth API测试..."
        bash packages/auth-api/auth_api_test.sh
    fi
    
    # 运行Payment API测试  
    if [ -f "packages/payment-api/payment-api-test.sh" ]; then
        print_info "运行Payment API测试..."
        bash packages/payment-api/payment-api-test.sh
    fi
    
    # 运行Subscription API测试
    if [ -f "packages/subscription-api/subscription-api-test.sh" ]; then
        print_info "运行Subscription API测试..."
        bash packages/subscription-api/subscription-api-test.sh
    fi
}

# 数据库操作
db_migrate() {
    print_info "运行数据库迁移..."
    docker compose exec auth-api npx prisma migrate deploy
    print_success "数据库迁移完成"
}

db_seed() {
    print_info "初始化数据库数据..."
    docker compose exec auth-api npm run db:seed
    print_success "数据库初始化完成"
}

# 清理
clean() {
    print_warning "这将删除所有容器、镜像和数据卷！"
    read -p "确认继续？(y/N): " confirm
    
    if [[ $confirm == [yY] ]]; then
        print_info "清理Docker资源..."
        docker compose down -v --rmi all --remove-orphans
        docker system prune -f
        print_success "清理完成"
    else
        print_info "取消清理操作"
    fi
}

# 显示帮助
show_help() {
    echo "Docker管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  build         构建应用服务"
    echo "  start         启动所有服务（基础设施+应用）"  
    echo "  start:infra   仅启动基础设施服务（数据库、Redis）"
    echo "  start:apps    仅启动应用服务"
    echo "  stop          停止所有服务"
    echo "  stop:apps     停止应用服务（保留数据库）"
    echo "  stop:infra    停止基础设施服务"
    echo "  restart     重启所有服务"
    echo "  status      查看服务状态"
    echo "  logs [服务名] 查看日志"
    echo "  check       检查服务健康状态"
    echo "  test        运行服务测试"
    echo "  db:migrate  运行数据库迁移"
    echo "  db:seed     初始化数据库数据" 
    echo "  clean       清理所有Docker资源"
    echo "  help        显示此帮助"
    echo ""
    echo "示例:"
    echo "  $0 start:infra          # 仅启动数据库"
    echo "  $0 build && $0 start    # 构建并启动所有"
    echo "  $0 start:apps           # 启动应用层"
    echo "  $0 logs auth-api        # 查看auth服务日志"
    echo "  $0 stop:apps            # 停止应用但保留数据库"
}

# 主逻辑
case "$1" in
    "build")
        check_docker
        build_all
        ;;
    "start")
        check_docker
        start_all
        ;;
    "start:infra")
        check_docker
        start_infra
        ;;
    "start:apps")
        check_docker
        start_apps
        ;;
    "stop")
        stop_all
        ;;
    "stop:apps")
        stop_apps
        ;;
    "stop:infra")
        stop_infra
        ;;
    "restart")
        restart_all
        ;;
    "status")
        status
        ;;
    "logs")
        logs "$2"
        ;;
    "check")
        check_services
        ;;
    "test")
        test_services
        ;;
    "db:migrate")
        db_migrate
        ;;
    "db:seed")
        db_seed
        ;;
    "clean")
        clean
        ;;
    "help"|"")
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac