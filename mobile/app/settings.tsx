import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/api/client';
import { useSettings } from '../src/contexts/SettingsContext';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { PasswordField } from '../src/ui/PasswordField';
import { Screen } from '../src/ui/Screen';
import { colors, spacing, typography, type ThemeName } from '../src/ui/theme';

const THEME_OPTIONS: { name: ThemeName; label: string; description: string }[] = [
  { name: 'ocean', label: 'Ocean', description: 'Calm blue and teal health-tech palette' },
  { name: 'sage', label: 'Sage', description: 'Soft green palette with a natural feel' },
  { name: 'lavender', label: 'Lavender', description: 'Gentle purple palette for a softer look' },
  { name: 'midnight', label: 'Midnight', description: 'Dark mode with bright accessible accents' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeName, theme, setThemeName, testMode, setTestMode } = useSettings();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill both password fields.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.patch('/api/auth/password', { current_password: currentPassword, new_password: newPassword });
      Alert.alert('Success', 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Password update failed', (error as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Screen padded={false} style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { marginTop: insets.top + spacing.sm }, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={theme.ink} />
          <Text style={[styles.backText, { color: theme.ink }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.ink }]}>Personalize MedAssist+</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Choose how your care workspace looks and behaves.</Text>

        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Theme</Text>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map((option) => {
            const selected = option.name === themeName;
            const optionTheme = {
              ocean: colors,
              sage: { ...colors, primary: '#2D7962', primarySoft: '#DDF2E8', background: '#F4FAF7' },
              lavender: { ...colors, primary: '#6658A7', primarySoft: '#EAE6FA', background: '#F8F7FC' },
              midnight: { ...colors, primary: '#65C9D0', primarySoft: '#214453', background: '#0F1B2D' },
            }[option.name];

            return (
              <Pressable
                key={option.name}
                onPress={() => { void setThemeName(option.name); }}
                style={({ pressed }) => [
                  styles.themeOption,
                  { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
                  selected && { borderWidth: 2 },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: optionTheme.background }]}>
                  <View style={[styles.swatchDot, { backgroundColor: optionTheme.primary }]} />
                  <View style={[styles.swatchLine, { backgroundColor: optionTheme.primarySoft }]} />
                </View>
                <Text style={[styles.optionLabel, { color: theme.ink }]}>{option.label}</Text>
                <Text style={[styles.optionDescription, { color: theme.inkMuted }]}>{option.description}</Text>
                {selected && <Text style={[styles.selected, { color: theme.primary }]}>Selected</Text>}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Security</Text>
        <Card style={styles.passwordCard}>
          <PasswordField
            label="Current password"
            placeholder="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            containerStyle={styles.passwordField}
          />
          <PasswordField
            label="New password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            containerStyle={styles.passwordField}
          />
          <Button
            title="Update password"
            onPress={handleChangePassword}
            loading={changingPassword}
            disabled={changingPassword}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.ink }]}>Testing</Text>
        <View style={[styles.testCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.testCopy}>
            <Text style={[styles.optionLabel, { color: theme.ink }]}>Test mode</Text>
            <Text style={[styles.optionDescription, { color: theme.inkMuted }]}>Show clearly labeled fake doctors, appointments, queue entries, patients, and reports for UI testing.</Text>
            <Text style={[styles.warning, { color: theme.warning }]}>No fake data is sent to backend.</Text>
          </View>
          <Switch
            value={testMode}
            onValueChange={(value) => { void setTestMode(value); }}
            trackColor={{ false: theme.borderStrong, true: theme.primarySoft }}
            thumbColor={testMode ? theme.primary : theme.inkSubtle}
          />
        </View>

        {testMode && (
          <Text style={[styles.testEnabled, { color: theme.success }]}>Test mode enabled. Disable it to remove fake data.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 40 },
  backButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.sm, marginBottom: spacing.xl },
  backText: { ...typography.label, fontSize: 15 },
  title: { ...typography.title },
  subtitle: { ...typography.body, marginTop: spacing.xs, marginBottom: spacing.xxl },
  sectionTitle: { ...typography.heading, marginBottom: spacing.md },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xxxl },
  themeOption: { width: '47%', minHeight: 170, borderRadius: 16, borderWidth: 1, padding: spacing.md },
  swatch: { height: 70, borderRadius: 10, padding: spacing.md, justifyContent: 'space-between', marginBottom: spacing.md },
  swatchDot: { width: 20, height: 20, borderRadius: 10 },
  swatchLine: { height: 10, width: '65%', borderRadius: 5 },
  optionLabel: { ...typography.heading, fontSize: 15 },
  optionDescription: { ...typography.caption, marginTop: spacing.xs },
  selected: { ...typography.caption, marginTop: spacing.sm, fontWeight: '700' },
  passwordCard: { marginBottom: spacing.xxxl, gap: spacing.md },
  passwordField: { marginBottom: spacing.sm },
  testCard: { borderRadius: 16, borderWidth: 1, padding: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  testCopy: { flex: 1, paddingRight: spacing.md },
  warning: { ...typography.caption, marginTop: spacing.sm, fontWeight: '600' },
  testEnabled: { ...typography.caption, marginTop: spacing.md },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
