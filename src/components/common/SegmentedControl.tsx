import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import useThemePalette from '../../hooks/useThemePalette';

interface Option {
    label: string;
    value: string;
}

interface SegmentedControlProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, options, value, onChange, error }) => {
    const COLORS = useThemePalette();

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: COLORS.textMuted }]}>{label.toUpperCase()}</Text>}
            <View style={[styles.wrapper, { backgroundColor: COLORS.card, borderColor: error ? COLORS.danger : COLORS.border }]}>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.option,
                            value === option.value && { backgroundColor: COLORS.primary }
                        ]}
                        onPress={() => onChange(option.value)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                { color: value === option.value ? '#fff' : COLORS.textMuted }
                            ]}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {error && <Text style={[styles.errorText, { color: COLORS.danger }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: "900",
        marginBottom: 8,
        letterSpacing: 1,
    },
    wrapper: {
        flexDirection: 'row',
        height: 48,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1.5,
    },
    option: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    optionText: {
        fontSize: 13,
        fontWeight: '800',
    },
    errorText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        marginLeft: 4,
    },
});

export default SegmentedControl;
