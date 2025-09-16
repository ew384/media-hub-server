import React from 'react';
import { Modal as AntModal, ModalProps } from 'antd';
import { cn } from '@/lib/utils';

interface CustomModalProps extends ModalProps {
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  variant?: 'default' | 'confirm' | 'info' | 'success' | 'warning' | 'error';
}

const Modal: React.FC<CustomModalProps> = ({
  size = 'medium',
  variant = 'default',
  className,
  ...props
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 400 };
      case 'large':
        return { width: 800 };
      case 'fullscreen':
        return { 
          width: '90vw',
          style: { top: 20, paddingBottom: 0 },
          bodyStyle: { height: 'calc(90vh - 120px)', overflow: 'auto' }
        };
      default:
        return { width: 600 };
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'confirm':
        return 'modal-confirm';
      case 'info':
        return 'modal-info';
      case 'success':
        return 'modal-success';
      case 'warning':
        return 'modal-warning';
      case 'error':
        return 'modal-error';
      default:
        return '';
    }
  };

  return (
    <AntModal
      {...props}
      {...getSizeStyles()}
      className={cn(getVariantClass(), className)}
      destroyOnClose
      maskClosable={false}
    />
  );
};

export default Modal;