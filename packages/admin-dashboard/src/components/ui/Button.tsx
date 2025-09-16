import React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';
import { cn } from '@/lib/utils';

interface ButtonProps extends AntButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'text';
  size?: 'small' | 'middle' | 'large';
  fullWidth?: boolean;
  gradient?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'middle',
  fullWidth = false,
  gradient = false,
  className,
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    const baseStyles = 'font-medium transition-all duration-200 border-0 shadow-sm';
    
    switch (variant) {
      case 'primary':
        return gradient
          ? cn(
              baseStyles,
              'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
              'text-white border-0 shadow-lg hover:shadow-xl'
            )
          : cn(
              baseStyles,
              'bg-blue-500 hover:bg-blue-600 text-white',
              'hover:shadow-md active:bg-blue-700'
            );
      
      case 'secondary':
        return cn(
          baseStyles,
          'bg-gray-100 hover:bg-gray-200 text-gray-700',
          'border border-gray-300 hover:border-gray-400'
        );
      
      case 'outline':
        return cn(
          baseStyles,
          'bg-transparent text-blue-500 border border-blue-500',
          'hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600'
        );
      
      case 'ghost':
        return cn(
          baseStyles,
          'bg-transparent text-gray-600 border-0',
          'hover:bg-gray-100 hover:text-gray-700'
        );
      
      case 'link':
        return cn(
          'text-blue-500 hover:text-blue-600 underline',
          'bg-transparent border-0 shadow-none p-0 h-auto'
        );
      
      case 'text':
        return cn(
          baseStyles,
          'bg-transparent text-gray-600 border-0 shadow-none',
          'hover:bg-gray-50 hover:text-gray-700'
        );
      
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'h-8 px-3 text-sm';
      case 'large':
        return 'h-12 px-6 text-base';
      default:
        return 'h-10 px-4 text-sm';
    }
  };

  const combinedClassName = cn(
    getVariantStyles(),
    getSizeStyles(),
    fullWidth && 'w-full',
    'rounded-lg',
    className
  );

  return (
    <AntButton
      {...props}
      size={size}
      className={combinedClassName}
    >
      {children}
    </AntButton>
  );
};

export default Button;