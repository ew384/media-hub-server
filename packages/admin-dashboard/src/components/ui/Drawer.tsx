import React from 'react';
import { Drawer as AntDrawer, DrawerProps } from 'antd';
import { cn } from '@/lib/utils';

interface CustomDrawerProps extends DrawerProps {
  size?: 'small' | 'medium' | 'large' | 'fullwidth';
  variant?: 'default' | 'form' | 'info';
}

const Drawer: React.FC<CustomDrawerProps> = ({
  size = 'medium',
  variant = 'default',
  className,
  ...props
}) => {
  const getSizeWidth = () => {
    switch (size) {
      case 'small':
        return 400;
      case 'large':
        return 800;
      case 'fullwidth':
        return '100vw';
      default:
        return 600;
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'form':
        return 'drawer-form';
      case 'info':
        return 'drawer-info';
      default:
        return '';
    }
  };

  return (
    <AntDrawer
      {...props}
      width={getSizeWidth()}
      className={cn(getVariantClass(), className)}
      destroyOnClose
      maskClosable={false}
    />
  );
};

export default Drawer;