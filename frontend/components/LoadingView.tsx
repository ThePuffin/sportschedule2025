import React from 'react';
import { View } from 'react-native';
import Loader from './Loader';

export default function LoadingView() {
  return (
    <div style={{ height: '80vh' }}>
      <View style={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Loader />
      </View>
    </div>
  );
}
