import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface FloatingActionButtonProps {
  label?: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ label, iconName = 'add', onPress }) => (
  <Pressable style={styles.button} onPress={onPress} android_ripple={{ color: '#FFFFFF20' }}>
    <Ionicons name={iconName} size={24} color="#fff" />
    {label ? <Text style={styles.label}>{label}</Text> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xxl,
    backgroundColor: Colors.Primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  label: {
    color: '#fff',
    marginLeft: Spacing.sm,
    fontWeight: '700',
  },
});

export default FloatingActionButton;
