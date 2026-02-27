import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

interface AppHeaderProps {
    title?: string;
    showMenu?: boolean;
    showBack?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title, showMenu = true, showBack = false }) => {
    const navigation = useNavigation<DrawerNavigationProp<any>>();

    return (
        <View style={styles.container}>
            {showMenu && (
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.toggleDrawer()}>
                    <Ionicons name="menu" size={28} color="#1E293B" />
                </TouchableOpacity>
            )}

            {showBack && (
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={26} color="#1E293B" />
                </TouchableOpacity>
            )}

            <View style={styles.titleContainer}>
                {title ? (
                    <Text style={styles.title}>{title}</Text>
                ) : (
                    <Text style={styles.greeting}>Hello, <Text style={styles.userName}>Manager</Text></Text>
                )}
            </View>

            <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={24} color="#64748B" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8FAFC',
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    greeting: {
        fontSize: 14,
        color: '#64748B',
    },
    userName: {
        fontWeight: '700',
        color: '#0F172A',
        fontSize: 16,
    },
});

export default AppHeader;
