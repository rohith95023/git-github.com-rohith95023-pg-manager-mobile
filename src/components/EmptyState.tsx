import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    message: string;
    icon?: keyof typeof Ionicons.prototype.name;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, icon = "document-text-outline" }) => {
    return (
        <View style={styles.container}>
            <Ionicons name={icon as any} size={64} color="#CBD5E1" />
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 40,
    },
    message: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 24,
    },
});

export default EmptyState;
