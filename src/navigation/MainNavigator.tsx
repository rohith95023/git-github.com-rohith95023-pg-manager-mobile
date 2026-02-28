import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native";
import {
    createDrawerNavigator,
    DrawerContentScrollView,
    DrawerItemList,
    DrawerItem,
} from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import ThemeToggleButton from "../components/ThemeToggleButton";

// Screens
import Dashboard from "../screens/Dashboard";
import PGsScreen from "../screens/PGsScreen";
import RoomsScreen from "../screens/RoomsScreen";
import TenantsScreen from "../screens/TenantsScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import ProfitLossScreen from "../screens/ProfitLossScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import SmartTenantFinder from "../screens/SmartTenantFinder";
import ResidentDetailScreen from "../screens/ResidentDetailScreen";


const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Custom Drawer Component
const CustomDrawerContent = (props: any) => {
    const { colors, isDark } = useTheme();
    const { user, logout } = useAuth();

    return (
        <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
            {/* Header / Logo */}
            <View style={styles.drawerHeader}>
                <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                    <Feather name="home" size={24} color="#fff" />
                </View>
                <Text style={[styles.logoText, { color: colors.text }]}>PG Manager</Text>
            </View>

            {/* Navigation Items */}
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                <View style={styles.itemsContainer}>
                    {/* Items are handled by props.navigation and route configs, 
                        but we can customize the look via screenOptions. 
                        We use DrawerItemList for the standard list. */}
                    <DrawerItemList {...props} />
                </View>
            </DrawerContentScrollView>

            {/* Footer / User Profile */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => props.navigation.navigate("Profile")}
                >
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{(user?.full_name || "U")[0]}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{user?.full_name || "User"}</Text>
                        <Text style={[styles.userRole, { color: colors.textSecondary }]}>{user?.role || "ADMIN"}</Text>
                    </View>
                    <Feather name="settings" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Feather name="log-out" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Component for Drawer Header Title
const HeaderTitle = ({ title, colors }: any) => (
    <Text style={[styles.headerTitle, { color: "#fff" }]}>{title}</Text>
);

// Custom Header Right Component (Menu)
const CustomHeaderRight = ({ navigation, tintColor }: any) => (
    <TouchableOpacity
        style={{ marginRight: 20, padding: 4 }}
        onPress={() => navigation.toggleDrawer()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
        <Ionicons name="menu" size={26} color={tintColor || "#fff"} />
    </TouchableOpacity>
);

const MainNavigator = () => {
    const { colors, isDark } = useTheme();

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                headerShown: true,
                headerLeft: () => (
                    <View style={{ marginLeft: 20 }}>
                        <ThemeToggleButton />
                    </View>
                ),
                headerRight: () => <CustomHeaderRight navigation={navigation} tintColor={colors.text} />,
                headerStyle: {
                    backgroundColor: colors.card,
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 100,
                },
                headerTintColor: colors.text,
                headerTitleAlign: "center",
                headerTitleStyle: {
                    color: colors.text,
                },
                drawerStyle: {
                    width: 300,
                    backgroundColor: colors.background,
                },
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: colors.textSecondary,
                drawerActiveBackgroundColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.15)",
                drawerLabelStyle: {
                    fontSize: 15,
                    fontWeight: "600",
                    marginLeft: -10,
                },
                drawerItemStyle: {
                    borderRadius: 12,
                    marginHorizontal: 12,
                    marginVertical: 4,
                    paddingHorizontal: 8,
                }
            })}
        >
            <Drawer.Screen
                name="Dashboard"
                component={Dashboard}
                options={({ navigation }) => ({
                    drawerIcon: ({ color }) => <Feather name="grid" size={20} color={color} />,
                    headerTitle: "Dashboard",
                    headerRight: () => <CustomHeaderRight navigation={navigation} tintColor={colors.text} />
                })}
            />
            <Drawer.Screen
                name="PGProperties"
                component={PGsScreen}
                options={{
                    drawerLabel: "PG Properties",
                    drawerIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
                    headerTitle: "PG Properties"
                }}
            />
            <Drawer.Screen
                name="RoomsBeds"
                component={RoomsScreen}
                options={{
                    drawerLabel: "Rooms & Beds",
                    drawerIcon: ({ color }) => <Feather name="box" size={20} color={color} />,
                    headerTitle: "Rooms & Beds"
                }}
            />

            <Drawer.Screen
                name="Residents"
                component={TenantsScreen}
                options={{
                    drawerLabel: "Resident Directory",
                    drawerIcon: ({ color }) => <Feather name="users" size={20} color={color} />,
                    headerTitle: "Resident Directory"
                }}
            />
            <Drawer.Screen
                name="TenantFinder"
                component={SmartTenantFinder}
                options={{
                    drawerLabel: ({ color }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <Text style={{ color, fontSize: 15, fontWeight: '600' }}>Smart Tenant Finder</Text>
                            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                        </View>
                    ),
                    drawerIcon: ({ color }) => <Feather name="search" size={20} color={color} />,
                    headerTitle: "Smart Tenant Finder"
                }}
            />
            <Drawer.Screen
                name="ResidentDetail"
                component={ResidentDetailScreen}
                options={{
                    drawerItemStyle: { display: 'none' },
                    headerShown: false, // Using custom header inside screen
                }}
            />
            <Drawer.Screen
                name="Finance"
                component={PaymentsScreen}
                options={{
                    drawerLabel: "Financial Records",
                    drawerIcon: ({ color }) => <Feather name="credit-card" size={20} color={color} />,
                    headerTitle: "Financial Records"
                }}
            />
            <Drawer.Screen
                name="Expenses"
                component={ExpensesScreen}
                options={{
                    drawerLabel: "Expense Tracker",
                    drawerIcon: ({ color }) => <Feather name="dollar-sign" size={20} color={color} />,
                    headerTitle: "Expense Tracker"
                }}
            />
            <Drawer.Screen
                name="ProfitLoss"
                component={ProfitLossScreen}
                options={{
                    drawerLabel: ({ color }) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <Text style={{ color, fontSize: 15, fontWeight: '600' }}>Profit & Loss</Text>
                            <View style={styles.betaBadge}><Text style={styles.betaBadgeText}>BETA</Text></View>
                        </View>
                    ),
                    drawerIcon: ({ color }) => <Feather name="trending-up" size={20} color={color} />,
                    headerTitle: "Profit & Loss"
                }}
            />
            <Drawer.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    drawerItemStyle: { display: 'none' }, // Hidden from main list
                    headerTitle: "My Profile"
                }}
            />
            <Drawer.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{
                    drawerItemStyle: { display: 'none' },
                    headerShown: false, // Internal header
                }}
            />
        </Drawer.Navigator>
    );
};

const styles = StyleSheet.create({
    drawerContainer: { flex: 1 },
    drawerHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 24,
        paddingTop: 60,
        marginBottom: 10,
    },
    logoBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    logoText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "900",
    },
    itemsContainer: {
        paddingTop: 10,
    },
    drawerFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.05)",
    },
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "800",
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    userRole: {
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: "600",
        textTransform: "uppercase",
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        marginLeft: 4,
    },
    logoutText: {
        color: "#ef4444",
        fontSize: 15,
        fontWeight: "700",
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "800",
    },
    newBadge: {
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    betaBadge: {
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    newBadgeText: {
        color: "#10b981",
        fontSize: 8,
        fontWeight: "900",
    },
    betaBadgeText: {
        color: "#f59e0b",
        fontSize: 8,
        fontWeight: "900",
    }
});

export default MainNavigator;
