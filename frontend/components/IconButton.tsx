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
  const [isHovered, setIsHovered] = useState(false);
  const [isLargeDevice, setIsLargeDevice] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      if (w <= 400) setIconSize(18);
      else if (w <= 800) setIconSize(26);
      else setIconSize(30);
      setIsLargeDevice(w > 768);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress && onPress();
    }
  };

  const handleClick = () => {
    if (disabled) return;
    onPress && onPress();
  };

  const showText = isLargeDevice && !!text;

  const containerStyle: React.CSSProperties = {
    width: showText ? '100%' : isHovered && text ? 'auto' : 'clamp(48px, 20vw, 160px)',
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
    padding: showText || (isHovered && text) ? '0 10px' : 0,
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        {(showText || (isHovered && text)) && (
          <span style={{ color: iconColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{text}</span>
        )}
      </div>
    </div>
  );
};

export default IconButton;
