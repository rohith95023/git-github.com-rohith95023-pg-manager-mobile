import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface InfoCardProps {
  title: string;
  subtitle: string;
  value?: string;
  onPress?: () => void;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, subtitle, value, onPress }) => (
  <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#E0E7FF' }}>
    <View style={styles.content}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.Card,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.H3,
    color: Colors.TextPrimary,
  },
  subtitle: {
    ...Typography.Caption,
    color: Colors.TextSecondary,
    marginTop: Spacing.xs,
  },
  value: {
    ...Typography.H3,
    color: Colors.Primary,
  },
});

export default InfoCard;
