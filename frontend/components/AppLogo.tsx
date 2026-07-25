import { ThemedText } from '@/components/ThemedText';
import { Link } from 'expo-router';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

interface AppLogoProps {
  compact?: boolean;
}

export default function AppLogo({ compact }: Readonly<AppLogoProps>) {
  return (
    <Link href="/" asChild>
      <TouchableOpacity activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Image source={require('@/assets/images/SkedAll.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
        <ThemedText
          type="title"
          aria-level="1"
          style={{
            fontSize: compact ? 20 : 30,
            fontWeight: '900',
            fontStyle: 'italic',
            letterSpacing: compact ? 0 : 1,
            fontFamily: 'Impact, sans-serif-condensed, sans-serif',
          }}
        >
          SkedAll
        </ThemedText>
      </TouchableOpacity>
    </Link>
  );
}
