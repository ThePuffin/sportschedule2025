import AppLogo from '@/components/AppLogo';
import React from 'react';
import { StyleProp, ViewStyle, useWindowDimensions } from 'react-native';

interface PageHeaderProps {
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function PageHeader({ rightElement, style }: Readonly<PageHeaderProps>) {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 15px 5px 15px',
        ...(style as Record<string, unknown>),
      }}
    >
      <AppLogo compact={isSmallDevice && !!rightElement} />
      {rightElement}
    </div>
  );
}
