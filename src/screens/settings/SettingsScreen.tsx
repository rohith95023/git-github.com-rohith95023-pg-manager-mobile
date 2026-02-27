import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import AppHeader from '../../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
    const settingsOptions = [
        { title: 'Profile Settings', icon: 'person-outline', color: '#3B82F6' },
        { title: 'Notification Preferences', icon: 'notifications-outline', color: '#10B981' },
        { title: 'App Theme', icon: 'color-palette-outline', color: '#8B5CF6' },
        { title: 'Data & Privacy', icon: 'shield-checkmark-outline', color: '#F59E0B' },
        { title: 'Help & Support', icon: 'help-circle-outline', color: '#64748B' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Settings" />
            <ScrollView>
                <View style={styles.section}>
                    {settingsOptions.map((option, index) => (
                        <TouchableOpacity key={index} style={styles.option}>
                            <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                                <Ionicons name={option.icon as any} size={22} color={option.color} />
                            </View>
                            <Text style={styles.optionText}>{option.title}</Text>
                            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    <Text style={styles.logoutText}>Sign Out from PG Manager</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    optionText: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        padding: 20,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
    },
});

export default SettingsScreen;
