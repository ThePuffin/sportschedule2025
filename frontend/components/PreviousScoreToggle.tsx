import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, Switch, View, ViewStyle } from 'react-native';

interface PreviousScoreToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export default function PreviousScoreToggle({ value, onValueChange, style }: PreviousScoreToggleProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View
        style={{
          opacity: value ? 0.3 : 1,
          transform: [{ scaleX: -1 }],
        }}
      >
        <MaterialIcons name="update-disabled" size={24} color="gray" />
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={value ? '#f5dd4b' : '#f4f3f4'}
        style={{ marginHorizontal: 10 }}
      />
      <View style={{ opacity: value ? 1 : 0.3 }}>
        <MaterialIcons name="restore" size={24} color="#81b0ff" />
      </View>
    </View>
  );
}
