import React from 'react';
import { Input as AntInput, InputProps, InputRef } from 'antd';
import { cn } from '@/lib/utils';

const { TextArea, Password, Search } = AntInput;

interface CustomInputProps extends InputProps {
  variant?: 'default' | 'filled' | 'borderless';
  inputSize?: 'small' | 'middle' | 'large';
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Input = React.forwardRef<InputRef, CustomInputProps>(({
  variant = 'default',
  inputSize = 'middle',
  error = false,
  helperText,
  label,
  className,
  ...props
}, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'filled':
        return 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500';
      case 'borderless':
        return 'border-transparent shadow-none';
      default:
        return '';
    }
  };

  const inputClassName = cn(
    getVariantClass(),
    error && 'border-red-500 focus:border-red-500',
    'transition-colors duration-200',
    className
  );

  const renderInput = () => (
    <AntInput
      {...props}
      ref={ref}
      size={inputSize}
      className={inputClassName}
      status={error ? 'error' : undefined}
    />
  );

  if (label || helperText) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {renderInput()}
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return renderInput();
});

Input.displayName = 'Input';

// 扩展组件
const InputTextArea = React.forwardRef<any, CustomInputProps & { rows?: number }>(({
  variant = 'default',
  error = false,
  helperText,
  label,
  className,
  ...props
}, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'filled':
        return 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500';
      case 'borderless':
        return 'border-transparent shadow-none';
      default:
        return '';
    }
  };

  const inputClassName = cn(
    getVariantClass(),
    error && 'border-red-500 focus:border-red-500',
    'transition-colors duration-200',
    className
  );

  const renderTextArea = () => (
    <TextArea
      {...props}
      ref={ref}
      className={inputClassName}
      status={error ? 'error' : undefined}
    />
  );

  if (label || helperText) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {renderTextArea()}
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return renderTextArea();
});

InputTextArea.displayName = 'InputTextArea';

const InputPassword = React.forwardRef<InputRef, CustomInputProps>(({
  variant = 'default',
  inputSize = 'middle',
  error = false,
  helperText,
  label,
  className,
  ...props
}, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'filled':
        return 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500';
      case 'borderless':
        return 'border-transparent shadow-none';
      default:
        return '';
    }
  };

const inputClassName = cn(
    getVariantClass(),
    error && 'border-red-500 focus:border-red-500',
    'transition-colors duration-200',
    className
  );

  const renderPassword = () => (
    <Password
      {...props}
      ref={ref}
      size={inputSize}
      className={inputClassName}
      status={error ? 'error' : undefined}
    />
  );

  if (label || helperText) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {renderPassword()}
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return renderPassword();
});

InputPassword.displayName = 'InputPassword';

const InputSearch = React.forwardRef<InputRef, CustomInputProps & {
  onSearch?: (value: string) => void;
  enterButton?: boolean | React.ReactNode;
}>(({
  variant = 'default',
  inputSize = 'middle',
  error = false,
  helperText,
  label,
  className,
  ...props
}, ref) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'filled':
        return 'bg-gray-50 border-transparent focus:bg-white focus:border-blue-500';
      case 'borderless':
        return 'border-transparent shadow-none';
      default:
        return '';
    }
  };

  const inputClassName = cn(
    getVariantClass(),
    error && 'border-red-500 focus:border-red-500',
    'transition-colors duration-200',
    className
  );

  const renderSearch = () => (
    <Search
      {...props}
      ref={ref}
      size={inputSize}
      className={inputClassName}
      status={error ? 'error' : undefined}
    />
  );

  if (label || helperText) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {renderSearch()}
        {helperText && (
          <p className={cn(
            'text-sm',
            error ? 'text-red-500' : 'text-gray-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }

  return renderSearch();
});

InputSearch.displayName = 'InputSearch';

// 导出所有组件
export { InputTextArea, InputPassword, InputSearch };
export default Input;