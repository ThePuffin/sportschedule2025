import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PillToggle, { PillToggleOption } from './PillToggle';

export type HomeGameFilter = 'all' | 'home' | 'away';

interface HomeGameToggleProps {
  value: HomeGameFilter;
  onValueChange: (value: HomeGameFilter) => void;
  style?: StyleProp<ViewStyle>;
}

export default function HomeGameToggle({ value, onValueChange, style }: Readonly<HomeGameToggleProps>) {
  const options: PillToggleOption<HomeGameFilter>[] = [
    { key: 'home', renderIcon: (color) => <Ionicons name="home" size={18} color={color} /> },
    { key: 'all', renderIcon: (color) => <PillToggleAllIcon color={color} /> },
    { key: 'away', renderIcon: (color) => <Ionicons name="airplane" size={18} color={color} /> },
  ];

  return <PillToggle value={value} onValueChange={onValueChange} options={options} style={style} />;
}

function PillToggleAllIcon({ color }: { color: string }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name="home" size={18} color={color} />
      <span style={{ fontSize: 14, fontWeight: '700', color }}>+</span>
      <Ionicons name="airplane" size={18} color={color} />
    </span>
  );
}
