import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, Animated, Easing } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/api/client';
import type { User } from '../../src/types';
import { Button } from '../../src/ui/Button';
import { FadeSlide, ScaleIn } from '../../src/ui/motion';
import { Screen } from '../../src/ui/Screen';
import { TextField } from '../../src/ui/TextField';
import { PasswordField } from '../../src/ui/PasswordField';
import { radii, roleThemes, spacing, typography, type ThemeColors } from '../../src/ui/theme';

type Role = 'patient' | 'doctor';

export default function LoginScreen() {
  const { login } = useAuth();
  const { role: routeRole } = useLocalSearchParams<{ role?: string }>();
  const initialRole: Role = routeRole === 'doctor' ? 'doctor' : 'patient';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initialRole);
  const [flip, setFlip] = useState<{ from: Role; to: Role } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rowWidth, setRowWidth] = useState(0);
  const chosenRole = useRef<Role>(initialRole);
  const spin = useRef(new Animated.Value(0)).current;
  const tint = useRef(new Animated.Value(initialRole === 'doctor' ? 1 : 0)).current;
  const travel = useRef(new Animated.Value(initialRole === 'doctor' ? 1 : 0)).current;
  const busy = useRef(false);

  useEffect(() => {
    if ((routeRole !== 'doctor' && routeRole !== 'patient') || busy.current) return;
    setRole(routeRole);
    chosenRole.current = routeRole;
    tint.setValue(routeRole === 'doctor' ? 1 : 0);
    travel.setValue(routeRole === 'doctor' ? 1 : 0);
  }, [routeRole, tint, travel]);

  const shownRole: Role = flip ? (revealed ? flip.to : flip.from) : role;
  const theme = roleThemes[shownRole];
  const pillWidth = rowWidth > 0 ? (rowWidth - spacing.sm) / 2 : 0;
  const pillShift = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth + spacing.sm],
  });
  const backgroundColor = tint.interpolate({
    inputRange: [0, 1],
    outputRange: [roleThemes.patient.background, roleThemes.doctor.background],
  });
  const frontRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontRole = flip?.from ?? role;
  const backRole = flip?.to ?? role;

  const chooseRole = (next: Role) => {
    if (next === role || busy.current) return;
    busy.current = true;
    chosenRole.current = next;
    setFlip({ from: role, to: next });
    setRevealed(false);
    spin.setValue(0);
    let swapped = false;
    const listener = spin.addListener(({ value }) => {
      if (!swapped && value >= 0.5) {
        swapped = true;
        setRevealed(true);
      }
    });
    Animated.parallel([
      Animated.timing(spin, { toValue: 1, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tint, { toValue: next === 'doctor' ? 1 : 0, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.spring(travel, { toValue: next === 'doctor' ? 1 : 0, friction: 7, tension: 68, useNativeDriver: true }),
    ]).start(() => {
      spin.removeListener(listener);
      setRole(next);
      setFlip(null);
      setRevealed(false);
      spin.setValue(0);
      busy.current = false;
    });
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
        identifier: identifier.trim(),
        password,
        role: chosenRole.current,
      });
      const data = (res as { data?: { token: string; user: User } }).data;
      if (data?.token && data?.user) {
        await login(data.token, data.user);
      }
    } catch (e) {
      Alert.alert('Login Failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false} style={styles.transparent}>
      <Animated.View style={[styles.fill, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <ScaleIn>
          <View style={styles.markStage}>
            <RoleFace role={frontRole} rotate={frontRotate} />
            <RoleFace role={backRole} rotate={backRotate} absolute />
          </View>
        </ScaleIn>
        <FadeSlide delay={80}>
          <Text style={[styles.title, { color: theme.ink }]}>MedAssist+</Text>
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>Your AI Healthcare Companion</Text>
        </FadeSlide>
      </View>

      <FadeSlide delay={140}>
      <TextField
        label="Email or phone"
        placeholder="Email or Phone"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
        themeOverride={theme}
      />
      <PasswordField
        label="Password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        themeOverride={theme}
      />

      <Text style={[styles.accountLabel, { color: theme.inkMuted }]}>I am signing in as</Text>
      <View style={styles.roleRow} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rolePill,
            { width: pillWidth, backgroundColor: theme.primary, transform: [{ translateX: pillShift }] },
          ]}
        />
        {(['patient', 'doctor'] as const).map((option) => {
          const selected = shownRole === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => chooseRole(option)}
              style={({ pressed }) => [styles.roleOption, pressed && styles.pressed]}
            >
              <Text style={{ color: selected ? theme.onPrimary : theme.ink, fontWeight: '700' }}>
                {option === 'patient' ? 'Patient' : 'Doctor'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={loading ? 'Logging in...' : 'Log in'}
        icon="log-in-outline"
        size="lg"
        themeOverride={theme}
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
        loading={loading}
      />

      <Link href={{ pathname: '/(auth)/register', params: { role: flip?.to ?? role } }} style={[styles.link, { color: theme.primary }]}>
        Don't have an account? Register
      </Link>
      </FadeSlide>
      </ScrollView>
      </Animated.View>
    </Screen>
  );
}

function RoleFace({ role, rotate, absolute = false }: { role: Role; rotate: Animated.AnimatedInterpolation<string>; absolute?: boolean }) {
  const palette: ThemeColors = roleThemes[role];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.logo,
        absolute && styles.logoBack,
        { backgroundColor: palette.primary, transform: [{ perspective: 900 }, { rotateY: rotate }] },
      ]}
    >
      <Text style={[styles.logoText, { color: palette.onPrimary }]}>{role === 'doctor' ? 'Dr' : 'M+'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  transparent: { backgroundColor: 'transparent' },
  fill: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  markStage: { width: 64, height: 64, marginBottom: spacing.lg },
  logo: { width: 64, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  logoBack: { position: 'absolute', top: 0, left: 0 },
  logoText: { fontSize: 22, fontWeight: '800' },
  title: { ...typography.display },
  subtitle: { ...typography.body, marginTop: spacing.xs, textAlign: 'center' },
  button: { marginTop: spacing.md, width: '100%' },
  link: { textAlign: 'center', marginTop: spacing.xl, fontSize: 14, fontWeight: '600' },
  accountLabel: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, position: 'relative' },
  rolePill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.md },
  roleOption: { flex: 1, minHeight: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.64 },
});
