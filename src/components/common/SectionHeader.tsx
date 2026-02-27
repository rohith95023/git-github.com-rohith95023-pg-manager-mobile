import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onActionPress }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel && onActionPress ? (
      <Pressable style={styles.action} onPress={onActionPress} android_ripple={{ color: '#E0E7FF' }}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  title: {
    color: Colors.TextPrimary,
    ...Typography.H3,
  },
  action: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 999,
  },
  actionText: {
    color: Colors.Primary,
    ...Typography.Caption,
    fontWeight: '600',
  },
});

export default SectionHeader;
