import React from 'react';
import { Spin, SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { cn } from '@/lib/utils';

interface LoadingProps extends SpinProps {
  variant?: 'default' | 'overlay' | 'inline' | 'page';
  text?: string;
  fullHeight?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  variant = 'default',
  text,
  fullHeight = false,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'overlay':
        return 'fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center';
      
      case 'inline':
        return 'inline-flex items-center justify-center';
      
      case 'page':
        return cn(
          'flex items-center justify-center',
          fullHeight ? 'min-h-screen' : 'min-h-[400px]'
        );
      
      default:
        return 'flex items-center justify-center p-4';
    }
  };

  const customIcon = (
    <div className="animate-spin">
      <LoadingOutlined style={{ fontSize: 24 }} />
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn(getVariantStyles(), className)}>
        <Spin
          {...props}
          indicator={customIcon}
          spinning={true}
        />
        {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn(getVariantStyles(), className)}>
      <div className="text-center">
        <Spin
          {...props}
          size="large"
          indicator={customIcon}
          spinning={true}
        />
        {text && (
          <div className="mt-4 text-sm text-gray-600">{text}</div>
        )}
      </div>
    </div>
  );
};

// 页面加载组件
export const PageLoading: React.FC<{ text?: string }> = ({ text = '加载中...' }) => (
  <Loading variant="page" text={text} fullHeight />
);

// 覆盖层加载组件
export const OverlayLoading: React.FC<{ text?: string }> = ({ text = '处理中...' }) => (
  <Loading variant="overlay" text={text} />
);

// 内联加载组件
export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => (
  <Loading variant="inline" text={text} size="small" />
);

// 表格加载组件
export const TableLoading: React.FC = () => (
  <div className="flex items-center justify-center py-16">
    <Loading text="加载数据中..." />
  </div>
);

// 卡片加载组件
export const CardLoading: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <Loading size="default" />
  </div>
);

// 按钮加载组件
export const ButtonLoading: React.FC = () => (
  <Loading variant="inline" size="small" />
);

// 骨架屏加载组件
export const SkeletonLoading: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    ))}
  </div>
);

// 图表加载组件
export const ChartLoading: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div 
    className="flex items-center justify-center bg-gray-50 rounded-lg"
    style={{ height }}
  >
    <Loading text="加载图表数据..." />
  </div>
);

export default Loading;