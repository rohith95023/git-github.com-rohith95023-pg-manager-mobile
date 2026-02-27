import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Ionicons } from '@expo/vector-icons';

const settingsOptions = [
  { id: 'profile', title: 'Profile Settings', icon: 'person-circle-outline', color: Colors.Primary },
  { id: 'notifications', title: 'Notification Preferences', icon: 'notifications-outline', color: Colors.Warning },
  { id: 'theme', title: 'App Theme', icon: 'color-palette-outline', color: Colors.PrimaryLight },
  { id: 'privacy', title: 'Data & Privacy', icon: 'shield-checkmark-outline', color: Colors.Success },
  { id: 'support', title: 'Help & Support', icon: 'help-circle-outline', color: Colors.TextSecondary },
];

type SettingsOption = {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const SettingsScreen = () => {
  const renderItem = useCallback(({ item }: { item: SettingsOption }) => (
    <Pressable style={styles.option} android_ripple={{ color: '#EFF6FF' }} onPress={() => {}}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '22' }]}>
        <Ionicons name={item.icon as any} size={22} color={item.color} />
      </View>
      <Text style={styles.optionText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.Border} />
    </Pressable>
  ), []);

  return (
    <ScreenContainer>
      <AppHeader title="Settings" />
      <SectionHeader title="Preferences" />
      <FlatList
        data={settingsOptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Card,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.TextPrimary,
  },
  separator: {
    height: Spacing.sm,
  },
});

export default SettingsScreen;
