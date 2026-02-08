import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedElementsProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedElements({ style, lightColor, darkColor, ...otherProps }: ThemedElementsProps) {
  const backgroundColor = useThemeColor({ light: lightColor || '#F0F0F0', dark: darkColor || '#121212' }, 'background');

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
