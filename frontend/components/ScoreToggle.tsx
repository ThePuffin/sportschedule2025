import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, Switch, View, ViewStyle } from 'react-native';

interface ScoreToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export default function ScoreToggle({ value, onValueChange, style }: ScoreToggleProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Ionicons name="eye-off-outline" size={20} color="gray" />
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#f5dd4b' : '#f4f3f4'}
        style={{ marginHorizontal: 10 }}
      />
      <Ionicons name="eye-outline" size={20} color="gray" />
    </View>
  );
}
