import { translateWord } from '@/utils/utils';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PillToggle, { PillToggleOption } from './PillToggle';

interface ScoreToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export default function ScoreToggle({ value, onValueChange, style }: Readonly<ScoreToggleProps>) {
  const helperText = translateWord('scoreView');

  const options: PillToggleOption<'hide' | 'show'>[] = [
    { key: 'hide', renderIcon: (color) => <Ionicons name="eye-off-outline" size={18} color={color} /> },
    { key: 'show', renderIcon: (color) => <Ionicons name="eye-outline" size={18} color={color} /> },
  ];

  return (
    <div title={helperText} style={{ display: 'inline-block' }}>
      <PillToggle
        value={value ? 'show' : 'hide'}
        onValueChange={(v) => onValueChange(v === 'show')}
        options={options}
        style={style}
      />
    </div>
  );
}
