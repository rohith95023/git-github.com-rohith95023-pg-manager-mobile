import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import AppHeader from '../../components/AppHeader';

const PaymentsScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Collections" showMenu={false} showBack={true} />
            <View style={styles.content}>
                <Text style={styles.placeholderText}>Payment History and Collection Logs</Text>
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
        fontSize: 16,
    },
});

export default PaymentsScreen;
