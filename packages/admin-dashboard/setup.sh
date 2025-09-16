#!/bin/bash

# 自媒体管理后台项目结构创建脚本
# Usage: chmod +x setup-project.sh && ./setup-project.sh

echo "🚀 开始创建自媒体管理后台项目结构..."

# 创建主要目录结构
echo "📁 创建目录结构..."

# src 目录
mkdir -p src/app/login
mkdir -p src/app/dashboard
mkdir -p src/app/users/create
mkdir -p "src/app/users/[id]"
mkdir -p "src/app/orders/[orderNo]"
mkdir -p src/app/subscriptions
mkdir -p src/app/analytics
mkdir -p src/app/settings
mkdir -p src/app/api/auth
mkdir -p src/app/api/users
mkdir -p src/app/api/orders
mkdir -p src/app/api/dashboard

# components 目录
mkdir -p src/components/ui
mkdir -p src/components/charts
mkdir -p src/components/forms
mkdir -p src/components/tables
mkdir -p src/components/layouts

# lib 目录
mkdir -p src/lib

# stores 目录
mkdir -p src/stores

# types 目录
mkdir -p src/types

# hooks 目录
mkdir -p src/hooks

# 其他目录
mkdir -p public
mkdir -p docs
mkdir -p scripts
mkdir -p nginx/conf.d
mkdir -p database
mkdir -p monitoring

echo "📄 创建核心配置文件..."

# 根目录配置文件
touch package.json
touch next.config.js
touch tailwind.config.js
touch postcss.config.js
touch tsconfig.json
touch .env.example
touch .env.local
touch .gitignore
touch .eslintrc.json
touch .prettierrc
touch README.md
touch Dockerfile
touch docker-compose.yml
touch .dockerignore

echo "📄 创建 App Router 页面文件..."

# 根布局
touch src/app/layout.tsx
touch src/app/globals.css
touch src/app/page.tsx

# 登录相关
touch src/app/login/page.tsx
touch src/app/login/layout.tsx

# 仪表板
touch src/app/dashboard/page.tsx
touch src/app/dashboard/layout.tsx

# 用户管理
touch src/app/users/page.tsx
touch src/app/users/create/page.tsx
touch "src/app/users/[id]/page.tsx"

# 订单管理
touch src/app/orders/page.tsx
touch "src/app/orders/[orderNo]/page.tsx"

# 订阅管理
touch src/app/subscriptions/page.tsx

# 数据分析
touch src/app/analytics/page.tsx

# 系统设置
touch src/app/settings/page.tsx

# API 路由
touch src/app/api/auth/route.ts
touch src/app/api/users/route.ts
touch src/app/api/orders/route.ts
touch src/app/api/dashboard/route.ts

echo "📄 创建组件文件..."

# UI 组件
touch src/components/ui/Button.tsx
touch src/components/ui/Input.tsx
touch src/components/ui/Modal.tsx
touch src/components/ui/Drawer.tsx
touch src/components/ui/Loading.tsx

# 图表组件
touch src/components/charts/LineChart.tsx
touch src/components/charts/BarChart.tsx
touch src/components/charts/PieChart.tsx

# 表单组件
touch src/components/forms/UserForm.tsx
touch src/components/forms/OrderForm.tsx
touch src/components/forms/LoginForm.tsx

# 表格组件
touch src/components/tables/DataTable.tsx
touch src/components/tables/UserTable.tsx
touch src/components/tables/OrderTable.tsx

# 布局组件
touch src/components/layouts/Sidebar.tsx
touch src/components/layouts/Header.tsx
touch src/components/layouts/Footer.tsx

echo "📄 创建工具库文件..."

# lib 目录文件
touch src/lib/api.ts
touch src/lib/auth.ts
touch src/lib/utils.ts
touch src/lib/constants.ts
touch src/lib/validations.ts

echo "📄 创建状态管理文件..."

# stores 目录文件
touch src/stores/auth.ts
touch src/stores/dashboard.ts
touch src/stores/users.ts
touch src/stores/orders.ts
touch src/stores/subscriptions.ts

echo "📄 创建类型定义文件..."

# types 目录文件
touch src/types/index.ts
touch src/types/user.ts
touch src/types/order.ts
touch src/types/subscription.ts
touch src/types/api.ts

echo "📄 创建自定义 Hooks 文件..."

# hooks 目录文件
touch src/hooks/useAuth.ts
touch src/hooks/useApi.ts
touch src/hooks/useLocalStorage.ts
touch src/hooks/usePermissions.ts

echo "📄 创建静态资源目录..."

# public 目录文件
touch public/favicon.ico
touch public/apple-touch-icon.png
touch public/manifest.json
mkdir -p public/images
mkdir -p public/icons

echo "📄 创建部署配置文件..."

# nginx 配置
touch nginx/nginx.conf
touch nginx/conf.d/default.conf

# 数据库初始化
touch database/init.sql
touch database/schema.sql

# 监控配置
touch monitoring/prometheus.yml

# 脚本文件
touch scripts/build.sh
touch scripts/deploy.sh
touch scripts/backup.sh

echo "📄 创建文档文件..."

# 文档目录
mkdir -p docs/api
mkdir -p docs/deployment
mkdir -p docs/development

touch docs/README.md
touch docs/API.md
touch docs/DEPLOYMENT.md
touch docs/CHANGELOG.md
touch docs/api/users.md
touch docs/api/orders.md
touch docs/deployment/docker.md
touch docs/development/setup.md

echo "📄 创建开发配置文件..."

# 开发工具配置
mkdir -p .husky
touch .husky/pre-commit
mkdir -p .vscode
touch .vscode/settings.json
touch .vscode/extensions.json

# Jest 测试配置
touch jest.config.js
mkdir -p __tests__
touch __tests__/setup.ts

# 创建示例文件内容
echo "📝 创建基础文件内容..."

# 创建基础的 .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Database
*.db
*.sqlite
*.sqlite3

# Docker
docker-compose.override.yml

# Temporary folders
tmp/
temp/
EOF

# 创建基础的 .dockerignore
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.next
.git
.gitignore
README.md
Dockerfile
docker-compose.yml
.env.local
.env.development.local
.env.test.local
.env.production.local
EOF

# 创建基础的 postcss.config.js
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 创建基础的 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 创建基础的 .eslintrc.json
cat > .eslintrc.json << 'EOF'
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error"
  }
}
EOF

# 创建基础的 .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF

echo "✅ 项目结构创建完成！"
echo ""
echo "📋 创建的目录和文件概览："
echo "   📁 src/"
echo "      📁 app/ (Next.js App Router)"
echo "      📁 components/ (React 组件)"
echo "      📁 lib/ (工具库)"
echo "      📁 stores/ (状态管理)"
echo "      📁 types/ (TypeScript 类型)"
echo "      📁 hooks/ (自定义 Hooks)"
echo "   📁 public/ (静态资源)"
echo "   📁 docs/ (项目文档)"
echo "   📁 scripts/ (构建脚本)"
echo "   📄 配置文件 (package.json, next.config.js 等)"
echo ""
echo "🔧 下一步操作："
echo "   1. 复制粘贴对应的代码到各个文件"
echo "   2. 运行 npm install 安装依赖"
echo "   3. 运行 npm run dev 启动开发服务器"
echo ""
echo "🎉 开始愉快地开发吧！"
