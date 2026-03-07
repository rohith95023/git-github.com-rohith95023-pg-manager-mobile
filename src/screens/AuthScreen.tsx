import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ForgotPasswordModal from "../components/modals/ForgotPasswordModal";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, flexGrow: 1, justifyContent: "center" },
    header: { alignItems: "center", marginBottom: 40 },
    logoContainer: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    title: { fontSize: 24, fontWeight: "900", letterSpacing: 1 },
    subtitle: { fontSize: 14, textAlign: "center", marginTop: 8, fontWeight: "500" },
    form: { width: "100%" },
    inputContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: "500" },
    authButton: { height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 8, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    authButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    toggleContainer: { flexDirection: "row", justifyContent: "center", marginTop: 24 }
});

const AuthScreen = ({ navigation }: any) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const { colors, isDark } = useTheme();
    const { login, signup } = useAuth();

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [dob, setDob] = useState("");
    const [gender, setGender] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all required fields.");
            return;
        }

        if (isSignUp) {
            const nameRegex = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
            const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
            const phoneRegex = /^\d{10}$/;
            const dobRegex = /^\d{4}-\d{2}-\d{2}$/;

            if (!fullName.trim() || !phone.trim() || !gender || !dob) {
                Alert.alert("Error", "Please fill in all fields for signup.");
                return;
            }
            if (!dobRegex.test(dob)) {
                Alert.alert("Error", "Please enter Date of Birth in YYYY-MM-DD format.");
                return;
            }
            if (fullName.trim().length < 4 || fullName.trim().length > 40) {
                Alert.alert("Error", "Name must be between 4 and 40 characters.");
                return;
            }
            if (!nameRegex.test(fullName.trim())) {
                Alert.alert("Error", "Only alphabets and spaces are allowed in Name.");
                return;
            }
            if (!phoneRegex.test(phone.trim())) {
                Alert.alert("Error", "Phone number must be exactly 10 digits.");
                return;
            }
            if (!emailRegex.test(email.trim())) {
                Alert.alert("Error", "Please enter a valid email address.");
                return;
            }
            if (password.length < 6 || password.length > 16) {
                Alert.alert("Error", "Password must be between 6 and 16 characters.");
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert("Error", "Passwords do not match.");
                return;
            }
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { success, error } = await signup(email, password, {
                    fullName,
                    phone,
                    gender,
                    dob
                });
                if (success) {
                    Alert.alert("Success", "Account created! Please verify your email.");
                    setIsSignUp(false);
                } else {
                    Alert.alert("Signup Failed", error);
                }
            } else {
                const { success, error } = await login(email, password);
                if (!success) {
                    Alert.alert("Login Failed", error);
                }
            }
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
                            <Feather name="shield" size={40} color="#fff" />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>THE PG MANAGER</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {isSignUp ? "Create your account to get started" : "Sign in to manage your properties"}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {isSignUp && (
                            <>
                                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Feather name="user" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Full Name"
                                        placeholderTextColor={colors.textSecondary}
                                        value={fullName}
                                        onChangeText={setFullName}
                                        style={[styles.input, { color: colors.text }]}
                                    />
                                </View>

                                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Feather name="calendar" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Date of Birth (YYYY-MM-DD)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={dob}
                                        onChangeText={setDob}
                                        style={[styles.input, { color: colors.text }]}
                                    />
                                </View>

                                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Feather name="users" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TouchableOpacity
                                        style={styles.input}
                                        onPress={() => {
                                            Alert.alert("Select Gender", "", [
                                                { text: "Male", onPress: () => setGender("MALE") },
                                                { text: "Female", onPress: () => setGender("FEMALE") },
                                                { text: "Other", onPress: () => setGender("OTHER") },
                                            ]);
                                        }}
                                    >
                                        <Text style={{ color: gender ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: "500" }}>
                                            {gender || "Gender"}
                                        </Text>
                                    </TouchableOpacity>
                                    <Feather name="chevron-down" size={16} color={colors.textSecondary} />
                                </View>

                                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Feather name="phone" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Phone Number"
                                        placeholderTextColor={colors.textSecondary}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        style={[styles.input, { color: colors.text }]}
                                    />
                                </View>
                            </>
                        )}

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

                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                style={[styles.input, { color: colors.text }]}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {isSignUp && (
                            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    placeholder="Confirm Password"
                                    placeholderTextColor={colors.textSecondary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    style={[styles.input, { color: colors.text }]}
                                />
                            </View>
                        )}

                        {!isSignUp && (
                            <TouchableOpacity
                                style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 }}
                                onPress={() => setShowForgotPassword(true)}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                                    Forgot Password?
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.authButton, { backgroundColor: colors.primary }]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.authButtonText}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.toggleContainer}>
                            <Text style={{ color: colors.textSecondary }}>
                                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                            </Text>
                            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                                    {isSignUp ? "Sign In" : "Sign Up"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ForgotPasswordModal
                visible={showForgotPassword}
                onClose={() => setShowForgotPassword(false)}
            />
        </SafeAreaView>
    );
};


export default AuthScreen;
