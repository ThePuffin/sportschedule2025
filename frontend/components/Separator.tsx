import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';

interface SeparatorProps {
  readonly height?: number;
  readonly label?: string;
}

export default function Separator({ height = 1, label }: Readonly<SeparatorProps>) {
  const themeColor = useThemeColor({}, 'text');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        margin: label ? '10px 0' : `${height}px 0`,
      }}
    >
      <div style={{ flex: 1, height, backgroundColor: themeColor, opacity: 0.2 }} />
      {label ? (
        <span
          style={{
            color: themeColor,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            opacity: 0.75,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      ) : null}
      <div style={{ flex: 1, height, backgroundColor: themeColor, opacity: 0.2 }} />
    </div>
  );
}
