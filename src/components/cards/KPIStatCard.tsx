import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface KPIStatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}

const KPIStatCard: React.FC<KPIStatCardProps> = ({ label, value, icon, color = Colors.Primary }) => (
  <View style={[styles.card, { borderColor: color + '33' }]}>
    <View style={[styles.icon, { backgroundColor: color + '22' }]}>
      {icon}
    </View>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Card,
    borderRadius: 16,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderWidth: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    ...Typography.H2,
    color: Colors.TextPrimary,
  },
  label: {
    ...Typography.Body,
    color: Colors.TextSecondary,
    marginTop: Spacing.xs,
  },
});

export default KPIStatCard;
