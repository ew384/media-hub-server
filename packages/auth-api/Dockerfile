# packages/auth-api/Dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# 依赖安装阶段
FROM base AS deps
WORKDIR /app

# 复制package文件和必要的源码
COPY packages/auth-api/package*.json ./packages/auth-api/
COPY packages/shared-database/package*.json ./packages/shared-database/
COPY packages/shared-database/prisma ./packages/shared-database/prisma

# 安装shared-database依赖（包含devDependencies，因为需要prisma）
WORKDIR /app/packages/shared-database
RUN npm ci

# 安装auth-api依赖（生产环境）
WORKDIR /app/packages/auth-api
RUN npm ci --omit=dev

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/packages/auth-api/node_modules ./packages/auth-api/node_modules
COPY --from=deps /app/packages/shared-database/node_modules ./packages/shared-database/node_modules

# 复制源码
COPY packages/auth-api ./packages/auth-api
COPY packages/shared-database ./packages/shared-database

# 生成Prisma客户端
WORKDIR /app/packages/shared-database
RUN npm run db:generate

# 构建应用
WORKDIR /app/packages/auth-api
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

# 创建用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 只复制生产需要的文件
COPY --from=builder --chown=nestjs:nodejs /app/packages/auth-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/auth-api/package*.json ./

# 重新安装生产依赖（不包含prisma）
RUN npm ci --omit=dev && npm cache clean --force

# 创建日志目录
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/api/v1/health || exit 1

CMD ["node", "dist/main.js"]