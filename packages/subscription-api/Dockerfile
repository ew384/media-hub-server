# packages/subscription-api/Dockerfile - 修复版本
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# 依赖安装阶段
FROM base AS deps
WORKDIR /app

# 首先复制并构建 shared-database
COPY packages/shared-database/package*.json ./packages/shared-database/
COPY packages/shared-database/prisma ./packages/shared-database/prisma
COPY packages/shared-database/src ./packages/shared-database/src
COPY packages/shared-database/tsconfig.json ./packages/shared-database/

# 安装 shared-database 依赖并构建
WORKDIR /app/packages/shared-database
RUN npm ci
RUN npm run build
RUN npm run db:generate

# 复制 subscription-api 的 package.json
WORKDIR /app
COPY packages/subscription-api/package*.json ./packages/subscription-api/

# 安装 subscription-api 依赖
WORKDIR /app/packages/subscription-api
RUN npm ci --omit=dev

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制构建好的 shared-database
COPY --from=deps /app/packages/shared-database ./packages/shared-database

# 复制 subscription-api 依赖和源码
COPY --from=deps /app/packages/subscription-api/node_modules ./packages/subscription-api/node_modules
COPY packages/subscription-api ./packages/subscription-api

# 确保 shared-database 在正确位置被识别
WORKDIR /app/packages/subscription-api
RUN ln -sf ../../packages/shared-database ./node_modules/@media-hub/database

# 构建 subscription-api
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

# 创建用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 复制构建产物和依赖
COPY --from=builder --chown=nestjs:nodejs /app/packages/subscription-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/subscription-api/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/packages/subscription-api/node_modules ./node_modules

# 确保 shared-database 在运行时也能找到
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-database ./node_modules/@media-hub/database

# 复制模板文件（如果需要）
COPY --from=builder --chown=nestjs:nodejs /app/packages/subscription-api/src/templates ./src/templates

USER nestjs
EXPOSE 3101

CMD ["node", "dist/main.js"]