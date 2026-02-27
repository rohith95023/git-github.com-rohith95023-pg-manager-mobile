import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import RoomsScreen from '../screens/rooms/RoomsScreen';
import TenantsScreen from '../screens/tenants/TenantsScreen';

const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Properties" component={PropertiesScreen} />
    <Stack.Screen name="Rooms" component={RoomsScreen} />
    <Stack.Screen name="Tenants" component={TenantsScreen} />
  </Stack.Navigator>
);

export default HomeStack;
