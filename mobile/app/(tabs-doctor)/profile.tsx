import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

export default function DoctorProfileScreen() {
  const { user, logout } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();

  const handleLogout = () => { void logout(); };

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
          {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
        </Text>
      </View>
      <Text style={[styles.name, { color: theme.ink }]}>{user?.name ?? 'Doctor'}</Text>
      <Text style={[styles.role, { color: theme.inkMuted }]}>Doctor</Text>
      <Text style={[styles.email, { color: theme.inkMuted }]}>{user?.email ?? ''}</Text>

      <View style={styles.section}>
        <Button title="Settings" variant="secondary" style={styles.settingsBtn} onPress={() => router.push('/settings')} />
        <Button title="Logout" variant="danger" style={styles.logoutBtn} onPress={handleLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: layout.horizontalPadding, paddingTop: spacing.xxxl },
  avatar: { width: 84, height: 84, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.white },
  name: { ...typography.title },
  role: { ...typography.body, marginTop: spacing.xs },
  email: { ...typography.caption, marginTop: spacing.xs },
  section: { width: '100%', marginTop: spacing.xxxl },
  settingsBtn: { width: '100%' },
  logoutBtn: { width: '100%', marginTop: spacing.md },
});
