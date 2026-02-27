import React from 'react';
import { SafeAreaView, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { Colors } from '../../constants/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style }) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={[styles.container, style]}>{children}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.Background,
  },
  container: {
    flex: 1,
  },
});

export default ScreenContainer;
