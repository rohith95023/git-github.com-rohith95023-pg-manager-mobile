import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';

import ScreenContainer from '../../components/common/ScreenContainer';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const LoginScreen = () => (
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
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={Colors.TextSecondary}
          secureTextEntry
        />
        <Text style={styles.errorText}>Invalid credentials will show here.</Text>
        <Pressable style={styles.button} android_ripple={{ color: '#2563EB30' }} onPress={() => {}}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>
        <View style={styles.row}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <Pressable onPress={() => {}}>
            <Text style={styles.link}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  </ScreenContainer>
);

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
    marginTop: Spacing.sm,
    color: Colors.Danger,
    ...Typography.Caption,
  },
});

export default LoginScreen;
