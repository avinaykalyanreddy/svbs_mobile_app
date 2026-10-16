import { useEffect } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setAuthUser, useAuthUser } from '@/lib/auth-session';

const C = { navy: '#102344', blue: '#3563E9', bg: '#F5F7FC', white: '#FFFFFF', muted: '#7C879B', border: '#E2E7F0', pale: '#E9EFFF' };

export default function ProfileScreen() {
  const user = useAuthUser();

  useEffect(() => {
    if (!user) router.replace('/login' as never);
  }, [user]);

  if (!user) return null;

  const logout = () => {
    setAuthUser(null);
    router.replace('/login' as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={C.navy} />
        </Pressable>
        <View style={styles.avatar}><Ionicons name="person-outline" size={34} color={C.blue} /></View>
        <Text style={styles.kicker}>YOUR ACCOUNT</Text>
        <Text style={styles.title}>{user.name}</Text>
        <Text style={styles.subtitle}>Your SVBS customer profile</Text>
        <View style={styles.card}>
          <ProfileField label="Email address" value={user.email} icon="mail-outline" />
          <ProfileField label="Mobile number" value={user.mobile_number} icon="call-outline" />
          <ProfileField label="Aadhaar number" value={user.aadhaar_masked || 'XXXXXX'} icon="card-outline" />
          <ProfileField label="Account type" value={user.role === 'admin' ? 'Admin' : 'Customer'} icon="person-circle-outline" />
        </View>
        {user.role === 'admin' && (
          <Pressable style={styles.adminButton} onPress={() => router.push('/admin' as never)} accessibilityRole="button">
            <Ionicons name="settings-outline" size={20} color={C.blue} />
            <Text style={styles.adminButtonText}>Open admin dashboard</Text>
          </Pressable>
        )}
        <Pressable style={styles.logout} onPress={logout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color="#C04444" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}><Ionicons name={icon} size={19} color={C.blue} /></View>
      <View style={styles.fieldCopy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { flexGrow: 1, padding: 22, paddingTop: 10 },
  back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  avatar: { width: 76, height: 76, borderRadius: 25, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 22 },
  kicker: { color: C.blue, fontWeight: '800', letterSpacing: 1.4, fontSize: 11 },
  title: { color: C.navy, fontSize: 28, fontWeight: '800', marginTop: 7 },
  subtitle: { color: C.muted, fontSize: 14, marginTop: 6 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 8, marginTop: 26 },
  field: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  fieldIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1 },
  label: { color: C.muted, fontSize: 12 },
  value: { color: C.navy, fontSize: 15, fontWeight: '700', marginTop: 5 },
  adminButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: C.pale, borderRadius: 15, marginTop: 20 },
  adminButtonText: { color: C.blue, fontWeight: '800', fontSize: 14 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: C.white, borderRadius: 15, borderWidth: 1, borderColor: '#F1D8D8', marginTop: 24 },
  logoutText: { color: '#C04444', fontWeight: '800', fontSize: 14 },
});
