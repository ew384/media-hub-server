/** @type {import('next').NextConfig} */
const nextConfig = {
  // ===== Docker 部署配置 =====
  output: 'standalone',
  
  // ===== 实验性功能配置 =====
  experimental: {
    // 为 Docker 构建优化文件跟踪
    outputFileTracingRoot: undefined,
    // 启用服务器组件日志（调试用）
    logging: {
      level: 'info',
    },
  },

  // ===== 构建配置 =====
  typescript: {
    // 开发时保持类型检查，生产构建时可以忽略以加速构建
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // 开发时保持 ESLint 检查
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },

  // ===== 性能优化 =====
  swcMinify: true,
  compress: true,
  
  // 图片优化
  images: {
    domains: ['localhost', '127.0.0.1'],
    formats: ['image/webp', 'image/avif'],
    // 添加图片尺寸配置以优化性能
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
          // React 相关库单独打包
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 30,
          },
        },
      };

      // 添加 Bundle Analyzer（可选，调试用）
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
    }

    // 添加别名以简化导入
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

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
      // 添加其他可能的重定向
      {
        source: '/admin',
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
          // API 路由的 CORS 配置
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'http://localhost:3103',
          },
        ],
      },
      // API 路由特定头配置
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // ===== 开发环境配置 =====
  ...(process.env.NODE_ENV === 'development' && {
    // 开发环境下启用更详细的日志
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
  }),
};

module.exports = nextConfig;