import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface QuickActionButtonProps {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    color?: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ label, icon, onPress, color = '#3B82F6' }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '23%',
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: '#334155',
        textAlign: 'center',
    },
});

export default QuickActionButton;
