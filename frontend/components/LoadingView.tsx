import React from 'react';
import { View } from 'react-native';
import Loader from './Loader';

export default function LoadingView() {
  return (
    <View style={{ height: '15%', justifyContent: 'center', alignItems: 'center' }}>
      <Loader />
    </View>
  );
}
