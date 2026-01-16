import { IconButtonProps } from '@/utils/types';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';

interface ExtendedIconButtonProps extends IconButtonProps {
  secondaryIconName?: string;
  text?: string;
}

const IconButton: React.FC<ExtendedIconButtonProps> = ({
  iconName,
  secondaryIconName,
  iconColor = 'white',
  buttonColor = 'black',
  borderColor = 'transparent',
  disabled = false,
  loading = false,
  onPress,
  text,
}) => {
  const [iconSize, setIconSize] = useState<number>(24);
  const [isLargeDevice, setIsLargeDevice] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const w = globalThis.window === undefined ? 1024 : globalThis.window.innerWidth;
      if (w <= 400) setIconSize(18);
      else if (w <= 800) setIconSize(26);
      else setIconSize(30);
      setIsLargeDevice(w > 768);
    };
    updateSize();
    globalThis.window?.addEventListener('resize', updateSize);
    return () => globalThis.window?.removeEventListener('resize', updateSize);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onPress?.(e as any);
  };

  const showText = isLargeDevice && !!text;

  const containerStyle: React.CSSProperties = {
    width: showText ? '100%' : 'clamp(48px, 20vw, 160px)',
    flex: showText ? 1 : undefined,
    height: 'clamp(48px, 8vw, 60px)',
    borderRadius: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: buttonColor,
    border: `1px solid ${borderColor}`,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    marginLeft: '1vw',
    marginRight: '1vw',
    padding: showText ? '0 10px' : 0,
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      style={containerStyle}
      title={text}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <Icon
          name={iconName}
          type="font-awesome"
          size={loading ? Math.max(12, iconSize - 6) : iconSize}
          color={iconColor}
        />
        {!showText && secondaryIconName && (
          <Icon
            name={secondaryIconName}
            type="font-awesome"
            size={loading ? Math.max(12, iconSize - 6) : iconSize}
            color={iconColor}
          />
        )}
        {showText && <span style={{ color: iconColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{text}</span>}
      </div>
    </div>
  );
};

export default IconButton;
