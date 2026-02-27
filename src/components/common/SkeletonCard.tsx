import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.lineShort} />
    <View style={styles.lineLong} />
    <View style={styles.lineMedium} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Card,
    padding: Spacing.lg,
    borderRadius: 16,
    marginVertical: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  lineShort: {
    width: '35%',
    height: 14,
    backgroundColor: Colors.Border,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  lineMedium: {
    width: '65%',
    height: 14,
    backgroundColor: Colors.Border,
    borderRadius: 6,
    marginTop: Spacing.sm,
  },
  lineLong: {
    width: '85%',
    height: 14,
    backgroundColor: Colors.Border,
    borderRadius: 6,
    marginTop: Spacing.sm,
  },
});

export default SkeletonCard;
