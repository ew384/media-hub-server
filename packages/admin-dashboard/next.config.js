/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===== Docker 部署配置 =====
  output: 'standalone',
  
  // ===== 实验性功能配置 =====
  experimental: {
    // 为 Docker 构建优化文件跟踪
    outputFileTracingRoot: undefined,
  },

  // ===== 构建配置 =====
  typescript: {
    // 生产构建时忽略类型错误以加速构建
    ignoreBuildErrors: true,
  },
  eslint: {
    // 生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },

  // ===== 性能优化 =====
  // 在 Alpine Linux 中禁用 SWC，避免兼容性问题
  swcMinify: false,
  compress: true,
  
  // 图片优化
  images: {
    domains: ['localhost', '127.0.0.1'],
    formats: ['image/webp', 'image/avif'],
  },

  // ===== 环境变量 =====
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || '自媒体管理后台',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },

  // ===== Webpack 优化配置 =====
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 生产环境优化
    if (!dev && !isServer) {
      // Bundle 分析和拆分
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // 第三方库单独打包
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Ant Design 单独打包
          antd: {
            test: /[\\/]node_modules[\\/](antd|@ant-design)[\\/]/,
            name: 'antd',
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }

    return config;
  },

  // ===== 重定向配置 =====
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // ===== 安全头配置 =====
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;