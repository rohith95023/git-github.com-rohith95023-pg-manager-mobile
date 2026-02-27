import React, { useMemo } from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import HomeStack from './HomeStack';
import FinanceStack from './FinanceStack';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import RoomsScreen from '../screens/rooms/RoomsScreen';
import TenantsScreen from '../screens/tenants/TenantsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

const Drawer = createDrawerNavigator();

const FinancePayments = () => <FinanceStack initialRoute="Payments" />;
const FinanceExpenses = () => <FinanceStack initialRoute="Expenses" />;
const FinanceProfitLoss = () => <FinanceStack initialRoute="ProfitLoss" />;

const CustomDrawerContent = (props: any) => {
  const auth = useAuth();
  const user = (auth.user as { full_name?: string; email?: string }) || null;
  const initials = useMemo(() => {
    const name = user?.full_name || user?.email || 'Manager';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [user]);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.full_name || 'Property Manager'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'manager@pgp.com'}</Text>
      </View>
      <View style={styles.listContainer}>
        <DrawerItemList {...props} />
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.logoutButton} onPress={auth.logout} android_ripple={{ color: '#FFEDD5' }}>
          <Ionicons name="log-out-outline" size={20} color={Colors.Danger} />
          <Text style={styles.logoutLabel}>Sign out</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
      drawerStyle: {
        backgroundColor: Colors.Card,
        width: 280,
      },
      sceneContainerStyle: {
        backgroundColor: Colors.Background,
      },
      drawerActiveTintColor: Colors.Primary,
      drawerInactiveTintColor: Colors.TextSecondary,
      drawerActiveBackgroundColor: '#E0EDFF',
      drawerLabelStyle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: -8,
      },
      drawerItemStyle: {
        borderRadius: 12,
        marginHorizontal: 8,
        marginVertical: 4,
      },
    }}
  >
    <Drawer.Screen
      name="Dashboard"
      component={HomeStack}
      options={{
        title: 'Dashboard',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="speedometer-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Properties"
      component={PropertiesScreen}
      options={{
        title: 'PG Properties',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="business-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Rooms"
      component={RoomsScreen}
      options={{
        title: 'Rooms & Beds',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="bed-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Residents"
      component={TenantsScreen}
      options={{
        title: 'Resident Directory',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="people-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="FinancialRecords"
      component={FinancePayments}
      options={{
        title: 'Financial Records',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="card-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="ExpenseTracker"
      component={FinanceExpenses}
      options={{
        title: 'Expense Tracker',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="receipt-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="ProfitLoss"
      component={FinanceProfitLoss}
      options={{
        title: 'Profit & Loss',
        drawerIcon: ({ color, size }) => (
          <Ionicons name="stats-chart-outline" size={size} color={color} />
        ),
      }}
    />
    <Drawer.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        drawerIcon: ({ color, size }) => (
          <Ionicons name="settings-outline" size={size} color={color} />
        ),
      }}
    />
  </Drawer.Navigator>
);

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: Colors.Card,
  },
  header: {
    padding: Spacing.xxl,
    backgroundColor: Colors.Primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    color: Colors.Primary,
    fontSize: 24,
    fontWeight: '700',
  },
  userName: {
    color: Colors.Card,
    ...Typography.H3,
    textAlign: 'center',
  },
  userEmail: {
    color: '#DBEAFE',
    ...Typography.Caption,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  logoutLabel: {
    color: Colors.Danger,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
});

export default DrawerNavigator;
