import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface EmptyStateProps {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = 'document-text-outline' }) => (
  <View style={styles.container}>
    <Ionicons name={icon} size={64} color={Colors.Border} />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  message: {
    marginTop: Spacing.md,
    color: Colors.TextSecondary,
    textAlign: 'center',
    ...Typography.Body,
  },
});

export default EmptyState;
