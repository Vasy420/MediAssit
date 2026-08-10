import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function DoctorProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.name?.charAt(0)?.toUpperCase() ?? 'D'}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name ?? 'Doctor'}</Text>
      <Text style={styles.role}>Doctor</Text>
      <Text style={styles.email}>{user?.email ?? ''}</Text>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', padding: 24, paddingTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  name: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  role: { fontSize: 14, color: '#64748B', marginTop: 4 },
  email: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  section: { width: '100%', marginTop: 40 },
  logoutBtn: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 16 },
});
