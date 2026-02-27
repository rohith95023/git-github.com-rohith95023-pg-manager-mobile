import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';

const LoadingOverlay = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={Colors.Primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoadingOverlay;
