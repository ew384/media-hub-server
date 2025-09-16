import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '自媒体管理后台',
  description: '自媒体多账号浏览器管理后台系统',
  keywords: '自媒体,管理后台,多账号,浏览器',
  authors: [{ name: '自媒体团队' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // 管理后台不需要搜索引擎索引
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1890ff" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AntdRegistry>
          <div id="root" className="min-h-screen">
            {children}
          </div>
        </AntdRegistry>
        
        {/* 全局脚本 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 主题初始化
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  console.warn('Theme initialization failed:', e);
                }
              })();
              
              // 防止页面闪烁
              document.documentElement.style.visibility = 'visible';
            `,
          }}
        />
        
        {/* 开发环境调试工具 */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // 开发环境调试信息
                console.log('%c🚀 自媒体管理后台系统', 'color: #1890ff; font-size: 16px; font-weight: bold;');
                console.log('Environment:', '${process.env.NODE_ENV}');
                console.log('Version:', '${process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}');
                console.log('API Base URL:', '${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}');
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
