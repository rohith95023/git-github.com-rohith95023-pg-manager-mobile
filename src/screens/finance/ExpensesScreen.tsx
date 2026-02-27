import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import AppHeader from '../../components/AppHeader';

const ExpensesScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Property Expenses" showMenu={false} showBack={true} />
            <View style={styles.content}>
                <Text style={styles.placeholderText}>Track your property maintenance and utility costs.</Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#64748B',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default ExpensesScreen;
