# packages/admin-dashboard/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 依赖安装阶段
FROM base AS deps
# 复制 package 文件
COPY packages/admin-dashboard/package.json packages/admin-dashboard/package-lock.json ./
RUN npm ci --only=production

# 开发依赖（构建时需要）
FROM base AS dev-deps
COPY packages/admin-dashboard/package.json packages/admin-dashboard/package-lock.json ./
RUN npm ci

# 构建阶段  
FROM base AS builder
# 复制开发依赖
COPY --from=dev-deps /app/node_modules ./node_modules
# 复制源码（包括 next.config.js）
COPY packages/admin-dashboard/ .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN npm run build

# 生产运行阶段
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制必要文件
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# 复制构建输出
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3103

ENV PORT=3103
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]