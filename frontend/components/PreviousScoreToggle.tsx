import { translateWord } from '@/utils/utils';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PillToggle, { PillToggleOption } from './PillToggle';

interface PreviousScoreToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

export default function PreviousScoreToggle({ value, onValueChange, style }: PreviousScoreToggleProps) {
  const helperText = translateWord('showHidePreviousScores');

  const options: PillToggleOption<'hide' | 'show'>[] = [
    { key: 'hide', renderIcon: (color) => <MaterialIcons name="update-disabled" size={20} color={color} /> },
    { key: 'show', renderIcon: (color) => <MaterialIcons name="restore" size={20} color={color} /> },
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
