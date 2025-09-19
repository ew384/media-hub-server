# packages/admin-dashboard/Dockerfile
FROM node:18 AS base

# 依赖安装阶段
FROM base AS deps
WORKDIR /app

# 复制 package 文件
COPY packages/admin-dashboard/package.json packages/admin-dashboard/package-lock.json ./

# 配置 npm 以提高稳定性
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --only=production

# 开发依赖（构建时需要）
FROM base AS dev-deps
WORKDIR /app

COPY packages/admin-dashboard/package.json packages/admin-dashboard/package-lock.json ./

# 安装所有依赖（包括开发依赖）
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# 构建阶段  
FROM base AS builder
WORKDIR /app

# 复制开发依赖
COPY --from=dev-deps /app/node_modules ./node_modules

# 复制源码
COPY packages/admin-dashboard/ .

# 设置构建环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# 构建前检查
RUN echo "=== 构建前检查 ===" && \
    ls -la && \
    test -f package.json && \
    test -f next.config.js && \
    echo "=== 文件检查通过 ==="

# 构建应用
RUN echo "=== 开始构建 ===" && \
    npm run build && \
    echo "=== 构建完成 ==="

# 生产运行阶段
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 创建用户
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# 创建应用目录并设置权限
RUN mkdir -p /app/.next && \
    chown -R nextjs:nodejs /app

# 复制必要文件
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# 复制生产依赖
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

EXPOSE 3103

ENV PORT=3103
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3103/api/health || curl -f http://localhost:3103/ || exit 1

CMD ["node", "server.js"]