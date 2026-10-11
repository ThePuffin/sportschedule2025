import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';

interface SeparatorProps {
  readonly height?: number;
  readonly opacity?: number;
}

export default function Separator({ height = 1, opacity = 0.2 }: Readonly<SeparatorProps>) {
  const themeColor = useThemeColor({}, 'text');

  return (
    <div
      style={{
        width: '100%',
        height,
        margin: `${height}px 0`,
        backgroundColor: themeColor,
        opacity,
        transition: 'opacity 200ms ease-in-out',
      }}
    />
  );
}
