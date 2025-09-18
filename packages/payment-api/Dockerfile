# packages/payment-api/Dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# 依赖安装阶段
FROM base AS deps
WORKDIR /app

COPY packages/payment-api/package*.json ./packages/payment-api/
COPY packages/shared-database/package*.json ./packages/shared-database/
COPY packages/shared-database/prisma ./packages/shared-database/prisma

# 安装shared-database依赖（包含prisma）
WORKDIR /app/packages/shared-database
RUN npm ci

# 安装payment-api依赖
WORKDIR /app/packages/payment-api
RUN npm ci --omit=dev

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖和源码
COPY --from=deps /app/packages/payment-api/node_modules ./packages/payment-api/node_modules
COPY --from=deps /app/packages/shared-database/node_modules ./packages/shared-database/node_modules
COPY packages/payment-api ./packages/payment-api
COPY packages/shared-database ./packages/shared-database

# 生成Prisma客户端
WORKDIR /app/packages/shared-database
RUN npm run db:generate

# 构建应用
WORKDIR /app/packages/payment-api
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/packages/payment-api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/payment-api/package*.json ./

# 重新安装生产依赖
RUN npm ci --omit=dev && npm cache clean --force

USER nestjs
EXPOSE 3102

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3102/health || exit 1

CMD ["node", "dist/main.js"]