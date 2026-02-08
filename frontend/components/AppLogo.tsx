import { ThemedText } from '@/components/ThemedText';
import { Link } from 'expo-router';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';

export default function AppLogo() {
  return (
    <Link href="/" asChild>
      <TouchableOpacity activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Image source={require('@/assets/images/SkedAll.png')} style={{ width: 30, height: 30 }} resizeMode="contain" />
        <ThemedText
          type="subtitle"
          style={{
            fontSize: 30,
            fontWeight: '900',
            fontStyle: 'italic',
            letterSpacing: 1,
            fontFamily: 'Impact, sans-serif-condensed, sans-serif',
          }}
        >
          SkedAll
        </ThemedText>
      </TouchableOpacity>
    </Link>
  );
}
