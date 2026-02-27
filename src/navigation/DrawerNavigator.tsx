import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import HomeStack from './HomeStack';
import FinanceStack from './FinanceStack';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import RoomsScreen from '../screens/rooms/RoomsScreen';
import TenantsScreen from '../screens/tenants/TenantsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

import { useAuth } from '../context/AuthContext';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: any) => {
    const { logout } = useAuth();

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>M</Text>
                </View>
                <Text style={styles.userName}>Property Manager</Text>
                <Text style={styles.userEmail}>manager@pgp.com</Text>
            </View>
            <View style={styles.itemList}>
                <DrawerItemList {...props} />
            </View>
            <View style={styles.footer}>
                <DrawerItem
                    label="Logout"
                    icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color="#EF4444" />}
                    onPress={logout}
                    labelStyle={{ color: '#EF4444', fontWeight: '600' }}
                />
            </View>
        </DrawerContentScrollView>
    );
};

const DrawerNavigator = () => {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'slide',
                gestureEnabled: true,
                drawerActiveTintColor: '#3B82F6',
                drawerInactiveTintColor: '#475569',
                drawerLabelStyle: {
                    marginLeft: -16,
                    fontSize: 14,
                    fontWeight: '600',
                },
                drawerItemStyle: {
                    borderRadius: 8,
                    marginVertical: 4,
                },
                drawerStyle: {
                    backgroundColor: '#FFFFFF',
                    width: 280,
                },
                sceneContainerStyle: {
                    backgroundColor: '#F8FAFC',
                }
            }}
        >
            <Drawer.Screen
                name="Dashboard"
                component={HomeStack}
                options={{
                    drawerIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Properties"
                component={PropertiesScreen}
                options={{
                    drawerIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Rooms"
                component={RoomsScreen}
                options={{
                    title: 'Rooms & Beds',
                    drawerIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Residents"
                component={TenantsScreen}
                options={{
                    title: 'Resident Directory',
                    drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Finance"
                component={FinanceStack}
                options={{
                    drawerIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
};

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
    },
    header: {
        padding: 24,
        backgroundColor: '#3B82F6',
        marginBottom: 8,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#3B82F6',
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    userEmail: {
        color: '#E0E7FF',
        fontSize: 12,
        marginTop: 2,
    },
    itemList: {
        flex: 1,
        paddingHorizontal: 8,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
});

export default DrawerNavigator;
