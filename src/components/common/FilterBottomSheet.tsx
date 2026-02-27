import React, { useEffect, useRef, useState, ReactNode } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    Animated,
    Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FilterBottomSheetProps {
    visible: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    onApply: () => void;
    onReset: () => void;
    applyLabel?: string;
    resetLabel?: string;
    children?: ReactNode;
}

const FilterBottomSheet = ({
    visible,
    title,
    description,
    onClose,
    onApply,
    onReset,
    applyLabel = "Apply",
    resetLabel = "Reset",
    children,
}: FilterBottomSheetProps) => {
    const translateY = useRef(new Animated.Value(1)).current;
    const [isMounted, setIsMounted] = useState(visible);

    useEffect(() => {
        if (visible) {
            setIsMounted(true);
        }

        Animated.timing(translateY, {
            toValue: visible ? 0 : 1,
            duration: 240,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && !visible) {
                setIsMounted(false);
            }
        });
    }, [visible, translateY]);

    if (!isMounted && !visible) {
        return null;
    }

    const translateStyle = {
        transform: [
            {
                translateY: translateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 360],
                }),
            },
        ],
    };

    return (
        <Modal
            visible={visible || isMounted}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>
            <Animated.View style={[styles.sheet, translateStyle]}>
                <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
                    <View style={styles.header}>
                        <View style={styles.handle} />
                        <Text style={styles.title}>{title}</Text>
                        {description ? <Text style={styles.description}>{description}</Text> : null}
                    </View>
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
                            <Text style={styles.resetText}>{resetLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={onApply}>
                            <Text style={styles.applyText}>{applyLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 260,
        maxHeight: "80%",
        overflow: "hidden",
        ...Platform.select({
            android: { elevation: 12 },
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.15, shadowRadius: 16 },
        }),
    },
    safeArea: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#cbd5f5",
        alignSelf: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 6,
    },
    description: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
    },
    resetButton: {
        flex: 1,
        marginRight: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#9ca3af",
        alignItems: "center",
    },
    resetText: {
        color: "#374151",
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        marginLeft: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#2563eb",
        alignItems: "center",
    },
    applyText: {
        color: "#fff",
        fontWeight: "700",
    },
});

export default FilterBottomSheet;
