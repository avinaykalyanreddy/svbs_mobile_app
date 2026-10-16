
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  navy: '#102344',
  blue: '#3563E9',
  background: '#F5F7FC',
  white: '#FFFFFF',
  muted: '#7C879B',
  border: '#E6EAF2',
  paleBlue: '#E9EFFF',
};

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.header}>
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={25} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.brandName}>SVBS</Text>
            <Text style={styles.brandSubtitle}>SECURE FINANCIAL SERVICES</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <Ionicons name="lock-closed" size={13} color={COLORS.blue} />
            <Text style={styles.eyebrowText}>SECURE. SIMPLE. SMART.</Text>
          </View>

          <Text style={styles.heroTitle}>
            Your finances,{'\n'}
            <Text style={styles.heroAccent}>your control.</Text>
          </Text>

          <Text style={styles.heroDescription}>
            A smarter way to manage your account, verify your identity,
            and access your services securely.
          </Text>
        </View>

        {/* Illustration */}
        <View style={styles.visualContainer}>
          <View style={styles.orbitOuter} />
          <View style={styles.orbitInner} />

          <View style={styles.mainVisual}>
            <View style={styles.visualTopRow}>
              <View style={styles.miniBrand}>
                <Ionicons name="shield-checkmark" size={19} color={COLORS.white} />
              </View>
              <View style={styles.secureBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.secureText}>SECURE ACCOUNT</Text>
              </View>
            </View>

            <View style={styles.visualMiddle}>
              <View style={styles.largeIcon}>
                <Ionicons name="finger-print-outline" size={55} color={COLORS.white} />
              </View>
              <Text style={styles.visualTitle}>Identity verified</Text>
              <Text style={styles.visualCaption}>
                Your security comes first
              </Text>
            </View>

            <View style={styles.visualFooter}>
              <Ionicons name="lock-closed" size={14} color="#BFD0FF" />
              <Text style={styles.visualFooterText}>
                PROTECTED BY SECURE VERIFICATION
              </Text>
            </View>
          </View>

          <View style={styles.floatingIcon}>
            <Ionicons name="checkmark-circle" size={27} color="#1B9A70" />
          </View>

          <View style={styles.floatingShield}>
            <Ionicons name="shield-checkmark" size={23} color={COLORS.blue} />
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="lock-closed-outline" size={19} color={COLORS.blue} />
            </View>
            <Text style={styles.benefitText}>Secure access</Text>
          </View>

          <View style={styles.benefitDivider} />

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="flash-outline" size={19} color={COLORS.blue} />
            </View>
            <Text style={styles.benefitText}>Simple setup</Text>
          </View>

          <View style={styles.benefitDivider} />

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name="shield-checkmark-outline" size={19} color={COLORS.blue} />
            </View>
            <Text style={styles.benefitText}>Verified identity</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create your SVBS account"
            onPress={() => router.push('/signup')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in to your SVBS account"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account?{' '}
              <Text style={styles.loginAccent}>Log in</Text>
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.muted} />
          <Text style={styles.footerText}>
            Your information deserves to stay protected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 1.1,
    fontWeight: '700',
    marginTop: 3,
  },
  hero: {
    marginTop: 35,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.paleBlue,
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 7,
  },
  eyebrowText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: COLORS.blue,
  },
  heroTitle: {
    fontSize: 39,
    lineHeight: 47,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: -1.5,
    marginTop: 18,
  },
  heroAccent: {
    color: COLORS.blue,
  },
  heroDescription: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 330,
  },
  visualContainer: {
    height: 245,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitOuter: {
    position: 'absolute',
    width: 245,
    height: 245,
    borderRadius: 123,
    borderWidth: 1,
    borderColor: '#DCE5FA',
  },
  orbitInner: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 1,
    borderColor: '#E4EAF8',
  },
  mainVisual: {
    width: '88%',
    maxWidth: 330,
    height: 202,
    backgroundColor: COLORS.navy,
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  visualTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniBrand: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#29436B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#243A5B',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#42D5A2',
  },
  secureText: {
    fontSize: 8,
    color: '#D8E4F8',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  visualMiddle: {
    alignItems: 'center',
    marginTop: -3,
  },
  largeIcon: {
    width: 69,
    height: 69,
    borderRadius: 23,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  visualTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  visualCaption: {
    color: '#B8C7E1',
    fontSize: 10,
    marginTop: 4,
  },
  visualFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  visualFooterText: {
    fontSize: 8,
    color: '#B8C7E1',
    letterSpacing: 0.7,
    fontWeight: '600',
  },
  floatingIcon: {
    position: 'absolute',
    top: 26,
    right: 5,
    width: 45,
    height: 45,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingShield: {
    position: 'absolute',
    bottom: 22,
    left: 5,
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  benefits: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 24,
    paddingVertical: 15,
    paddingHorizontal: 5,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
  },
  benefit: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  benefitIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: COLORS.paleBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 9,
    color: COLORS.navy,
    fontWeight: '700',
    textAlign: 'center',
  },
  benefitDivider: {
    width: 1,
    height: 37,
    backgroundColor: COLORS.border,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  loginAccent: {
    color: COLORS.blue,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 23,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 10,
  },
});
