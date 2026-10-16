import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const C = {
  navy: '#102344',
  blue: '#3563E9',
  background: '#F5F7FC',
  white: '#FFFFFF',
  muted: '#7C879B',
  border: '#E2E7F0',
  paleBlue: '#E9EFFF',
  green: '#19845B',
};

const steps = ['Details', 'Mobile', 'Email'];

export default function SignupScreen() {
  const [step, setStep] = useState(0);
  const [aadhaar, setAadhaar] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const continueToMobileOtp = () => {
    if (!/^\d{12}$/.test(aadhaar)) {
      Alert.alert('Check Aadhaar number', 'Enter the 12-digit Aadhaar number.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter your name as it appears on Aadhaar.');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert('Check mobile number', 'Enter a 10-digit mobile number.');
      return;
    }
    setStep(1);
  };

  const verifyMobileOtp = () => {
    if (!/^\d{6}$/.test(mobileOtp)) {
      Alert.alert('Check OTP', 'Enter the 6-digit mobile OTP.');
      return;
    }
    setMobileVerified(true);
    setStep(2);
  };

  const continueToEmailOtp = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Check email address', 'Enter a valid email address.');
      return;
    }
    setEmailOtp('');
    setEmailVerified(false);
    setEmailOtpSent(true);
  };

  const verifyEmailOtp = () => {
    if (!/^\d{6}$/.test(emailOtp)) {
      Alert.alert('Check OTP', 'Enter the 6-digit email OTP.');
      return;
    }
    setEmailVerified(true);
  };

  const submit = () => {
    Alert.alert(
      'Verification service required',
      'This signup screen is a frontend prototype. Connect Aadhaar, SMS OTP, and email OTP services before accepting or submitting real KYC details.'
    );
  };

  const title = step === 0 ? 'Create your account.' : step === 1 ? 'Verify your mobile.' : 'Verify your email.';
  const subtitle =
    step === 0
      ? 'Enter your details exactly as registered with Aadhaar.'
      : step === 1
        ? `Enter the 6-digit code sent to +91 ${mobile}.`
        : 'Add your email address and verify it with a one-time code.';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => (step === 0 ? router.back() : setStep(step - 1))} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logo}><Ionicons name="shield-checkmark" size={24} color={C.white} /></View>
            <Text style={styles.brand}>SVBS</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>SECURE SIGN UP</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.progressRow}>
            {steps.map((label, index) => {
              const active = index === step;
              const complete = index < step || (index === 2 && emailVerified);
              return (
                <View key={label} style={styles.progressItem}>
                  <View style={[styles.progressCircle, active && styles.progressCircleActive, complete && styles.progressCircleComplete]}>
                    {complete
                      ? <Ionicons name="checkmark" size={15} color={C.white} />
                      : <Text style={[styles.progressNumber, active && styles.progressNumberActive]}>{index + 1}</Text>}
                  </View>
                  <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{label}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            {step === 0 && (
              <>
                <Field label="Aadhaar number" icon="card-outline" value={aadhaar} onChangeText={(value) => setAadhaar(value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar number" keyboardType="number-pad" maxLength={12} />
                <Field label="Name as per Aadhaar" icon="person-outline" value={name} onChangeText={setName} placeholder="Enter your full name" autoCapitalize="words" />
                <Field label="Mobile number as per Aadhaar" icon="call-outline" value={mobile} onChangeText={(value) => { setMobile(value.replace(/\D/g, '').slice(0, 10)); setMobileVerified(false); }} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} />
                <PrimaryButton label="Continue to mobile OTP" onPress={continueToMobileOtp} />
              </>
            )}

            {step === 1 && (
              <>
                <View style={styles.verifiedInfo}>
                  <Ionicons name="call-outline" size={19} color={C.blue} />
                  <Text style={styles.verifiedText}>Mobile number ending in {mobile.slice(-4)}</Text>
                </View>
                <Field label="Mobile OTP" icon="keypad-outline" value={mobileOtp} onChangeText={(value) => setMobileOtp(value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" keyboardType="number-pad" maxLength={6} />
                <Pressable onPress={() => setMobileOtp('')} style={styles.resendButton} accessibilityRole="button">
                  <Text style={styles.resendText}>Clear code</Text>
                </Pressable>
                <PrimaryButton label="Verify mobile OTP" onPress={verifyMobileOtp} />
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Email address" icon="mail-outline" value={email} onChangeText={(value) => { setEmail(value); setEmailVerified(false); setEmailOtpSent(false); }} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                {!emailOtpSent && !emailVerified && (
                  <PrimaryButton label="Send email OTP" onPress={continueToEmailOtp} />
                )}
                {emailOtpSent && !emailVerified && (
                  <>
                    <Field label="Email OTP" icon="keypad-outline" value={emailOtp} onChangeText={(value) => setEmailOtp(value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" keyboardType="number-pad" maxLength={6} />
                    <PrimaryButton label="Verify email OTP" onPress={verifyEmailOtp} />
                  </>
                )}
                {emailVerified && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={22} color={C.green} />
                    <Text style={styles.successText}>Email verified. Your details are ready for submission.</Text>
                  </View>
                )}
                <PrimaryButton label="Final submit" onPress={submit} disabled={!mobileVerified || !emailVerified} />
              </>
            )}
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={C.blue} />
            <Text style={styles.noticeText}>Prototype only: no OTP is sent or validated, and details are not submitted. Connect secure verification services before using this for real KYC.</Text>
          </View>

          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={15} color={C.muted} />
            <Text style={styles.footerText}>Your identity details should only be handled through secure, approved services.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  maxLength?: number;
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
};

function Field({ label, icon, value, onChangeText, placeholder, keyboardType, maxLength, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={19} color={C.muted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA3B5"
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, disabled && styles.disabledButton]} accessibilityRole="button">
      <Text style={styles.primaryButtonText}>{label}</Text>
      <Ionicons name="arrow-forward" size={19} color={C.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 25, paddingTop: 12, paddingBottom: 28 },
  backButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
  logo: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '800', letterSpacing: 1.2, color: C.navy },
  intro: { marginTop: 30, marginBottom: 24 },
  eyebrow: { color: C.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 9 },
  title: { color: C.navy, fontSize: 30, lineHeight: 37, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  progressCircle: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#E8ECF4', alignItems: 'center', justifyContent: 'center' },
  progressCircleActive: { backgroundColor: C.blue },
  progressCircleComplete: { backgroundColor: C.green },
  progressNumber: { fontSize: 12, fontWeight: '700', color: C.muted },
  progressNumberActive: { color: C.white },
  progressLabel: { color: C.muted, fontSize: 12, fontWeight: '600' },
  progressLabelActive: { color: C.navy, fontWeight: '800' },
  card: { padding: 20, borderRadius: 22, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, shadowColor: C.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 },
  field: { marginBottom: 17 },
  label: { color: C.navy, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  inputContainer: { minHeight: 53, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FCFDFF' },
  input: { flex: 1, color: C.navy, fontSize: 15, paddingVertical: 13 },
  primaryButton: { minHeight: 54, borderRadius: 15, marginTop: 6, paddingHorizontal: 18, backgroundColor: C.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: C.white, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.86 },
  disabledButton: { opacity: 0.42 },
  verifiedInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, marginBottom: 20, borderRadius: 13, backgroundColor: C.paleBlue },
  verifiedText: { color: C.navy, fontSize: 14, fontWeight: '700' },
  resendButton: { alignSelf: 'flex-end', marginTop: -7, marginBottom: 12, paddingVertical: 7 },
  resendText: { color: C.blue, fontSize: 13, fontWeight: '700' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, marginTop: 14, marginBottom: 8, borderRadius: 13, backgroundColor: '#E9F6F0' },
  successText: { flex: 1, color: C.green, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 14, marginTop: 17, borderRadius: 14, backgroundColor: C.paleBlue },
  noticeText: { flex: 1, color: C.navy, fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 20, paddingHorizontal: 2 },
  footerText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 },
});
