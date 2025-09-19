# packages/auth-api/Dockerfile - Debian版本
FROM node:18-bullseye-slim AS base

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

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

# 复制 auth-api 的 package.json
WORKDIR /app
COPY packages/auth-api/package*.json ./packages/auth-api/

# 安装 auth-api 依赖
WORKDIR /app/packages/auth-api
RUN npm ci --omit=dev

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制构建好的 shared-database
COPY --from=deps /app/packages/shared-database ./packages/shared-database

# 复制 auth-api 依赖和源码
COPY --from=deps /app/packages/auth-api/node_modules ./packages/auth-api/node_modules
COPY packages/auth-api ./packages/auth-api

# 确保 shared-database 在正确位置被识别
WORKDIR /app/packages/auth-api
RUN ln -sf ../../packages/shared-database ./node_modules/@media-hub/database

# 构建 auth-api
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

# 创建用户
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nestjs

# 复制构建产物和依赖
COPY --from=builder --chown=nestjs:nodejs /app/packages/auth-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/auth-api/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/packages/auth-api/node_modules ./node_modules

# 确保 shared-database 在运行时也能找到
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-database ./node_modules/@media-hub/database

# 创建日志目录
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/api/v1/health || exit 1

CMD ["node", "dist/main.js"]