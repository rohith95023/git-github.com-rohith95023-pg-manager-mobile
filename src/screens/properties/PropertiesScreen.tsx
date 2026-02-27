import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import AppHeader from '../../components/AppHeader';
import EmptyState from '../../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';

const PropertiesScreen = () => {
    const properties: any[] = []; // Placeholder

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="My Properties" />
            {properties.length === 0 ? (
                <EmptyState
                    message="No properties added yet. Tap the button below to add your first property."
                    icon="business-outline"
                />
            ) : (
                <FlatList
                    data={properties}
                    renderItem={({ item }) => <View />}
                    keyExtractor={item => item.id}
                />
            )}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={30} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        backgroundColor: '#3B82F6',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default PropertiesScreen;
