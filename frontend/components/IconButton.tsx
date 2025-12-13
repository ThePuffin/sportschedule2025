import { IconButtonProps } from '@/utils/types';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';

const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  iconColor = 'white',
  buttonColor = 'black',
  borderColor = 'transparent',
  disabled = false,
  loading = false,
  onPress,
}) => {
  const [iconSize, setIconSize] = useState<number>(24);

  useEffect(() => {
    const updateSize = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
      if (w <= 400) setIconSize(18);
      else if (w <= 800) setIconSize(26);
      else setIconSize(30);
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

  const containerStyle: React.CSSProperties = {
    width: 'clamp(48px, 20vw, 160px)',
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
    marginLeft: '5vw',
    marginRight: '5vw',
    padding: 0,
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={containerStyle}
    >
      <Icon
        name={iconName}
        type="font-awesome"
        size={loading ? Math.max(12, iconSize - 6) : iconSize}
        color={iconColor}
      />
    </div>
  );
};

export default IconButton;
