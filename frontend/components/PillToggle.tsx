import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';

export interface PillToggleOption<T extends string> {
  key: T;
  renderIcon: (color: string) => React.ReactNode;
}

interface PillToggleProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: PillToggleOption<T>[];
  style?: StyleProp<ViewStyle>;
}

export default function PillToggle<T extends string>({
  value,
  onValueChange,
  options,
  style,
}: Readonly<PillToggleProps<T>>) {
  const unselectedBackgroundColor = useThemeColor({ light: '#e0e0e0', dark: '#333333' }, 'background');
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#000');
  const themeTextColor = useThemeColor({}, 'text');

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: unselectedBackgroundColor,
          borderRadius: 20,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {options.map((option, index) => {
        const isActive = value === option.key;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const iconColor = isActive ? selectedTextColor : themeTextColor;

        return (
          <Pressable
            key={option.key}
            onPress={() => onValueChange(option.key)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderTopLeftRadius: isFirst ? 20 : 0,
              borderBottomLeftRadius: isFirst ? 20 : 0,
              borderTopRightRadius: isLast ? 20 : 0,
              borderBottomRightRadius: isLast ? 20 : 0,
              backgroundColor: isActive ? selectedBackgroundColor : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {option.renderIcon(iconColor)}
          </Pressable>
        );
      })}
    </View>
  );
}
