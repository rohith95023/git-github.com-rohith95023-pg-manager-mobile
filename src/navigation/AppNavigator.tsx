import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { DataProvider } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";

// Navigators & Screens
import AuthScreen from "../screens/AuthScreen";
import MainNavigator from "./MainNavigator";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { user, loading } = useAuth();
    const { colors } = useTheme();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    // Wrap authenticated area only — DataContext fetches after login
                    <Stack.Screen name="Main">
                        {() => (
                            <DataProvider>
                                <MainNavigator />
                            </DataProvider>
                        )}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Auth" component={AuthScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
