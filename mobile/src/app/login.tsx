
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LOGIN_API_URL } from '@/constants/api';
import { AuthUser, setAuthUser } from '@/lib/auth-session';

const C = {
  navy: '#102344',
  blue: '#3563E9',
  background: '#F5F7FC',
  white: '#FFFFFF',
  muted: '#7C879B',
  border: '#E2E7F0',
  paleBlue: '#E9EFFF',
};

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    const loginIdentifier = identifier.trim();
    const normalizedMobile = loginIdentifier.replace(/[\s()-]/g, '').replace(/^\+91/, '');
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier);
    const validMobile = /^[6-9]\d{9}$/.test(normalizedMobile);

    if (!loginIdentifier || !password) {
      Alert.alert('Missing details', 'Enter your registered email or mobile number and password.');
      return;
    }
    if (!validEmail && !validMobile) {
      Alert.alert('Check your login details', 'Enter a valid email address or 10-digit Indian mobile number.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result?.detail === 'string'
          ? result.detail
          : typeof result?.identifier?.[0] === 'string'
            ? result.identifier[0]
            : 'Login failed. Check your details and try again.';
        throw new Error(message);
      }
      if (!result || !['admin', 'user'].includes(result.role) || typeof result.token !== 'string' || result.token.length === 0) {
        throw new Error('The server returned invalid login details. Please try again.');
      }
      const user = result as AuthUser;
      setAuthUser(user);
      router.replace(user.role === 'admin' ? '/admin' as never : '/dashboard' as never);
    } catch (error) {
      Alert.alert('Unable to log in', error instanceof Error ? error.message : 'Check your internet connection and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons
                name="shield-checkmark"
                size={25}
                color={C.white}
              />
            </View>
            <Text style={styles.brand}>SVBS</Text>
          </View>

          {/* Introduction */}
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Login to your{'\n'}account.</Text>
            <Text style={styles.subtitle}>
              Access your account securely with your registered credentials.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Phone number or email</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={C.muted}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter phone or email"
                placeholderTextColor="#9AA3B5"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
                textContentType="username"
                returnKeyType="next"
              />
            </View>

            <View style={styles.passwordHeading}>
              <Text style={styles.label}>Password</Text>

              <Pressable
                onPress={() =>
                  router.push('/forgot-password' as never)
                }
                accessibilityRole="button"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={C.muted}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9AA3B5"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color={C.muted}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => void handleLogin()}
              disabled={isLoggingIn}
              style={({ pressed }) => [
                styles.loginButton,
                (pressed || isLoggingIn) && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.loginButtonText}>{isLoggingIn ? 'Checking details…' : 'Login'}</Text>
              {!isLoggingIn && <Ionicons name="arrow-forward" size={20} color={C.white} />}
            </Pressable>
          </View>

          {/* Signup */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <Pressable
              onPress={() => router.push('/signup')}
              accessibilityRole="button"
            >
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>

          {/* Security footer */}
          <View style={styles.footer}>
            <View style={styles.footerIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={C.blue}
              />
            </View>
            <View style={styles.footerCopy}>
              <Text style={styles.footerTitle}>Your security matters</Text>
              <Text style={styles.footerSubtitle}>
                Keep your password private. Never share your login details.
              </Text>
            </View>
          </View>

          <Text style={styles.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 28,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.navy,
  },
  intro: {
    marginTop: 34,
  },
  eyebrow: {
    color: C.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  title: {
    color: C.navy,
    fontSize: 35,
    lineHeight: 43,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 320,
  },
  form: {
    marginTop: 34,
  },
  label: {
    color: C.navy,
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    height: 57,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 11,
    marginTop: 10,
    marginBottom: 23,
  },
  input: {
    flex: 1,
    height: '100%',
    color: C.navy,
    fontSize: 14,
    paddingVertical: 0,
  },
  passwordHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotText: {
    color: C.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  loginButton: {
    height: 57,
    backgroundColor: C.blue,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 7,
  },
  loginButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 27,
  },
  signupText: {
    color: C.muted,
    fontSize: 13,
  },
  signupLink: {
    color: C.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.paleBlue,
    borderRadius: 15,
    padding: 15,
    marginTop: 35,
  },
  footerIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCopy: {
    flex: 1,
    gap: 4,
  },
  footerTitle: {
    color: C.navy,
    fontSize: 12,
    fontWeight: '800',
  },
  footerSubtitle: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  legal: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 22,
  },
});
