import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill both fields');
      return;
    }
    setChanging(true);
    try {
      await api.patch('/api/auth/password', { current_password: currentPassword, new_password: newPassword });
      Alert.alert('Success', 'Password updated');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name || 'Patient'}</Text>
      <Text style={styles.role}>{user?.role?.toUpperCase() || 'PATIENT'}</Text>

      <View style={styles.infoCard}>
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Phone" value={user?.phone || 'Not set'} />
        <InfoRow label="User ID" value={user?.user_id} />
      </View>

      <TouchableOpacity
        style={styles.option}
        onPress={() => setShowPasswordChange(!showPasswordChange)}
      >
        <Text style={styles.optionText}>Change Password</Text>
        <Text style={styles.optionArrow}>{showPasswordChange ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showPasswordChange && (
        <View style={styles.pwForm}>
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="New Password (min 6 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.saveBtn, changing && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={changing}
          >
            <Text style={styles.saveBtnText}>{changing ? 'Updating...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563EB' },
  name: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  role: { fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 24 },
  infoCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  infoLabel: { fontSize: 14, color: '#64748B' },
  infoValue: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  optionText: { fontSize: 15, color: '#1E293B' },
  optionArrow: { fontSize: 12, color: '#94A3B8' },
  pwForm: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 10 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  logoutBtn: { marginTop: 24, width: '100%', backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontWeight: '600', fontSize: 16 },
});
