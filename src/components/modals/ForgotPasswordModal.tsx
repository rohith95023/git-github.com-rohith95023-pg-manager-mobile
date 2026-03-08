import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
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

interface ForgotPasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ visible, onClose }) => {
    const { colors, isDark } = useTheme();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const otpRefs = useRef<Array<TextInput | null>>([]);

    const handleRequestOtp = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email.");
            return;
        }
        setLoading(true);
        try {
            await authClient.requestPasswordReset(email);
            Alert.alert("Success", "6-digit OTP sent to your email.");
            setStep(2);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            Alert.alert("Error", "Please enter the 6-digit OTP.");
            return;
        }
        setLoading(true);
        try {
            await authClient.verifyOtp(email, otpCode);
            setStep(3);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await authClient.resetPassword(email, newPassword);
            Alert.alert("Success", "Password reset successful! Please login.");
            onClose();
            // Reset state
            setStep(1);
            setEmail('');
            setOtp(['', '', '', '', '', '']);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {step === 1 ? "Enter your email to receive a code" :
                    step === 2 ? `Enter the code sent to ${email}` :
                        "Choose a new secure password"}
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
                            {step === 1 && (
                                <>
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
                                        onPress={handleRequestOtp}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Send Code</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <View style={styles.otpContainer}>
                                        {otp.map((digit, index) => (
                                            <TextInput
                                                key={index}
                                                ref={el => { otpRefs.current[index] = el; }}
                                                style={[styles.otpInput, {
                                                    color: colors.text,
                                                    backgroundColor: colors.card,
                                                    borderColor: otp[index] ? colors.primary : colors.border
                                                }]}
                                                maxLength={1}
                                                keyboardType="number-pad"
                                                value={digit}
                                                onChangeText={v => handleOtpChange(v, index)}
                                                onKeyPress={e => handleOtpKeyPress(e, index)}
                                            />
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                        onPress={handleVerifyOtp}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Verify Code</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setStep(1)}
                                        style={styles.backButton}
                                    >
                                        <Text style={{ color: colors.textSecondary }}>Wrong email? Go back</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="New Password"
                                            placeholderTextColor={colors.textSecondary}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry
                                            style={[styles.input, { color: colors.text }]}
                                        />
                                    </View>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
                                        <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            placeholder="Confirm New Password"
                                            placeholderTextColor={colors.textSecondary}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry
                                            style={[styles.input, { color: colors.text }]}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 24 }]}
                                        onPress={handleResetPassword}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Update Password</Text>}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: '60%' },
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
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    otpInput: { width: 45, height: 55, borderRadius: 12, borderWidth: 1.5, textAlign: 'center', fontSize: 20, fontWeight: '700' },
    backButton: { marginTop: 20, alignItems: 'center' }
});

export default ForgotPasswordModal;
