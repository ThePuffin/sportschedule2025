import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';

interface SeparatorProps {
  readonly height?: number;
  readonly label?: string;
  readonly opacity?: number;
}

export default function Separator({ height = 1, label, opacity = 0.2 }: Readonly<SeparatorProps>) {
  const themeColor = useThemeColor({}, 'text');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: label ? 8 : 0,
        width: '100%',
        margin: label ? '10px 0' : `${height}px 0`,
      }}
    >
      <div style={{ flex: 1, height, backgroundColor: themeColor, opacity, transition: 'opacity 200ms ease-in-out' }} />
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
      <div style={{ flex: 1, height, backgroundColor: themeColor, opacity, transition: 'opacity 200ms ease-in-out' }} />
    </div>
  );
}
