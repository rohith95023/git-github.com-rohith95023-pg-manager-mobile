import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { authClient } from '../../services/apiClient';

interface ResendVerificationModalProps {
    visible: boolean;
    onClose: () => void;
}

const ResendVerificationModal: React.FC<ResendVerificationModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResend = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email.");
            return;
        }
        setLoading(true);
        try {
            await authClient.resendVerification(email);
            Alert.alert("Success", "Verification link sent! Please check your email inbox (and spam folder).");
            onClose();
            setEmail('');
        } catch (err: any) {
            const rawError = err.message?.toLowerCase() || "";
            let friendlyMessage = "Failed to resend the verification link. Please try again.";
            let title = "Error";

            // Map backend error reasons to human-readable ones
            if (rawError.includes("not registered")) {
                friendlyMessage = "We couldn't find an account with that email address. Please make sure it's correct.";
                title = "Account Not Found";
            } else if (rawError.includes("already verified")) {
                friendlyMessage = "This account is already verified! You can go ahead and sign in.";
                title = "Already Verified";
            } else if (rawError.includes("wait")) {
                friendlyMessage = "For security reasons, please wait a few minutes before requesting another link.";
                title = "Too Many Requests";
            } else {
                friendlyMessage = err.message || friendlyMessage;
            }

            Alert.alert(title, friendlyMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Resend Link</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your email address to resend the verification link.
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderHeader()}

                        <View style={styles.form}>
                            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Feather name="mail" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Email Address"
                                    placeholderTextColor={colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={[styles.input, { color: colors.text }]}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                onPress={handleResend}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Resend Link</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '50%' },
    header: { marginBottom: 32 },
    closeButton: { alignSelf: 'flex-end', marginBottom: 8 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    subtitle: { fontSize: 14, lineHeight: 20 },
    form: { width: '100%' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: '500' },
    actionButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16, elevation: 2 },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ResendVerificationModal;
