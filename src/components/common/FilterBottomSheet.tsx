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
    Platform,
    Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useThemePalette from "../../hooks/useThemePalette";

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
    const COLORS = useThemePalette();
    const windowHeight = Dimensions.get("window").height;
    const bottomSheetMaxHeight = windowHeight * 0.9;
    const scrollViewMaxHeight = bottomSheetMaxHeight - 180;

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
            <Animated.View
                style={[
                    styles.sheet,
                    translateStyle,
                    { backgroundColor: COLORS.card, maxHeight: bottomSheetMaxHeight },
                ]}
            >
                <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
                    <View style={styles.contentWrapper}>
                        <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
                            <View style={[styles.handle, { backgroundColor: COLORS.primary + "40" }]} />
                            <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
                            {description ? <Text style={[styles.description, { color: COLORS.textMuted }]}>{description}</Text> : null}
                        </View>
                        <View style={styles.scrollWrapper}>
                            <ScrollView
                                style={[styles.content, { maxHeight: scrollViewMaxHeight }]}
                                contentContainerStyle={[styles.contentContainer, { flexGrow: 1 }]}
                                showsVerticalScrollIndicator={true}
                                keyboardShouldPersistTaps="handled"
                                alwaysBounceVertical={true}
                                bounces={true}
                                nestedScrollEnabled
                            >
                                {children}
                            </ScrollView>
                        </View>
                    </View>
                </SafeAreaView>
                <View style={[styles.actionsContainer, { borderTopColor: COLORS.border }]}>
                    <SafeAreaView edges={["bottom"]} style={styles.actionsSafeArea}>
                        <View style={styles.actions}>
                            <TouchableOpacity style={[styles.resetButton, { borderColor: COLORS.border }]} onPress={onReset}>
                                <Text style={[styles.resetText, { color: COLORS.text }]}>{resetLabel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.applyButton, { backgroundColor: COLORS.primary }]} onPress={onApply}>
                                <Text style={[styles.applyText, { color: "#fff" }]}>{applyLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
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
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            minHeight: 400,
            maxHeight: "90%",
            overflow: "hidden",
            ...Platform.select({
            android: { elevation: 12 },
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.15, shadowRadius: 16 },
        }),
    },
    safeArea: {
        flex: 1,
        justifyContent: "space-between",
        minHeight: 0,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
    },
    contentWrapper: {
        flex: 1,
        minHeight: 0,
    },
    scrollWrapper: {
        flex: 1,
        minHeight: 0,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
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
        textAlign: "center",
    },
    content: {
        flex: 1,
        minHeight: 0,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    actionsContainer: {
        borderTopWidth: 1,
        backgroundColor: "transparent",
    },
    actionsSafeArea: {
        flex: 1,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
    },
    resetButton: {
        flex: 1,
        marginRight: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
    },
    resetText: {
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        marginLeft: 12,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    applyText: {
        fontWeight: "700",
    },
});

export default FilterBottomSheet;
