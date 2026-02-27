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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth() as any;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
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
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your PGs securely.</Text>
        </View>
        <View style={styles.form}>
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
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.TextSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            android_ripple={{ color: '#2563EB30' }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
          <View style={styles.row}>
            <Text style={styles.footerText}>Don’t have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </View>
        </View>
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
    justifyContent: 'center',
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

export default LoginScreen;

