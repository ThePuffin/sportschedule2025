import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { Image, View } from 'react-native';

export default function AppLogo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
    </View>
  );
}
