# packages/admin-dashboard/Dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# 构建阶段  
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js构建配置
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# 添加standalone输出配置到next.config.js
RUN echo "/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  output: 'standalone',\n  experimental: {\n    outputFileTracingRoot: undefined\n  }\n}\n\nmodule.exports = nextConfig" > next.config.js

RUN npm run build

# 生产运行阶段
FROM base AS runner  
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3103

ENV PORT 3103
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]