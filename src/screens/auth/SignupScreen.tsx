import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenContainer from '../../components/common/ScreenContainer';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signup } = useAuth() as any;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !phone) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signup(email, password, {
        fullName,
        phone,
        role: 'MANAGER', // Explicitly signing up as manager
        gender: 'OTHER', // Default or add a selector
      });

      if (!result.success) {
        setError(result.error || 'Signup failed. Please try again.');
      } else {
        // Signup success! AuthContext will trigger navigation via user state change
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Set up your manager account in minutes.</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Aarav Patel"
              placeholderTextColor={Colors.TextSecondary}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="manager@pgmanager.com"
              placeholderTextColor={Colors.TextSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={Colors.TextSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={Colors.TextSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              android_ripple={{ color: '#2563EB30' }}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.row}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.H1,
    color: Colors.TextPrimary,
  },
  subtitle: {
    ...Typography.Body,
    color: Colors.TextSecondary,
    marginTop: Spacing.sm,
  },
  form: {
    backgroundColor: Colors.Card,
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.Border,
  },
  label: {
    ...Typography.Caption,
    color: Colors.TextSecondary,
    marginTop: Spacing.md,
  },
  input: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.Border,
    backgroundColor: '#F8FAFC',
    color: Colors.TextPrimary,
  },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.Primary,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...Typography.Body,
    fontWeight: '700',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    color: Colors.TextSecondary,
    marginRight: Spacing.xs,
  },
  link: {
    color: Colors.Primary,
    fontWeight: '600',
  },
  errorText: {
    marginTop: Spacing.md,
    color: Colors.Danger,
    ...Typography.Caption,
    textAlign: 'center',
  },
});

export default SignupScreen;

