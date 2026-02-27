import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface FinanceCardProps {
  title: string;
  amount: string;
  type: 'income' | 'expense';
  subtitle?: string;
  onPress?: () => void;
}

const FinanceCard: React.FC<FinanceCardProps> = ({ title, amount, type, subtitle, onPress }) => {
  const color = type === 'income' ? Colors.Success : Colors.Danger;

  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#E0E7FF' }}>
      <View style={styles.textRow}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={[styles.amount, { color }]}>{amount}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Card,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.Body,
    fontWeight: '600',
  },
  amount: {
    ...Typography.H3,
  },
  subtitle: {
    marginTop: Spacing.sm,
    ...Typography.Caption,
    color: Colors.TextSecondary,
  },
});

export default FinanceCard;
