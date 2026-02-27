import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentsScreen from '../screens/finance/PaymentsScreen';
import ExpensesScreen from '../screens/finance/ExpensesScreen';
import ProfitLossScreen from '../screens/finance/ProfitLossScreen';

const Stack = createNativeStackNavigator();

const FinanceStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} />
        </Stack.Navigator>
    );
};

export default FinanceStack;
