import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showMenu?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showMenu = true,
  showBack = false,
  onMenuPress,
  onBackPress,
}) => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  const handleMenu = () => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    navigation.toggleDrawer();
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {showMenu && (
          <Pressable style={styles.iconBox} onPress={handleMenu} android_ripple={{ color: '#E0E7FF' }}>
            <Ionicons name="menu" size={24} color={Colors.TextPrimary} />
          </Pressable>
        )}
        {showBack && (
          <Pressable style={styles.iconBox} onPress={handleBack} android_ripple={{ color: '#E0E7FF' }}>
            <Ionicons name="arrow-back" size={24} color={Colors.TextPrimary} />
          </Pressable>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title || 'Hello, Manager'}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Pressable style={styles.iconBox} android_ripple={{ color: '#E0E7FF' }}>
          <Ionicons name="notifications-outline" size={22} color={Colors.TextSecondary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.Background,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.Background,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  title: {
    color: Colors.TextPrimary,
    ...Typography.H3,
  },
  subtitle: {
    color: Colors.TextSecondary,
    ...Typography.Caption,
    marginTop: 2,
  },
});

export default AppHeader;
