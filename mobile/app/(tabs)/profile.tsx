import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSettings } from '../../src/contexts/SettingsContext';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Screen } from '../../src/ui/Screen';
import { colors, layout, radii, spacing, typography } from '../../src/ui/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const handleLogout = () => { void logout(); };

  return (
    <Screen padded={false}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {(user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </Text>
      </View>
      <Text style={[styles.name, { color: theme.ink }]}>{user?.name || 'Patient'}</Text>
      <Text style={[styles.role, { color: theme.inkMuted }]}>{user?.role?.toUpperCase() || 'PATIENT'}</Text>

      <Card style={styles.infoCard}>
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Phone" value={user?.phone || 'Not set'} />
        <InfoRow label="User ID" value={user?.user_id} />
      </Card>

      <Button title="Settings" variant="secondary" style={styles.settingsBtn} onPress={() => router.push('/settings')} />
      <Button title="Logout" variant="danger" style={styles.logoutBtn} onPress={handleLogout} />
    </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const { theme } = useSettings();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.inkMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.ink }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.horizontalPadding, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 76, height: 76, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 25, fontWeight: '800', color: colors.primary },
  name: { ...typography.title },
  role: { ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.xl },
  infoCard: { width: '100%', marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.surfaceMuted },
  infoLabel: { ...typography.caption },
  infoValue: { ...typography.caption, fontWeight: '600' },
  settingsBtn: { marginTop: spacing.xl, width: '100%' },
  logoutBtn: { marginTop: spacing.md, width: '100%' },
});
