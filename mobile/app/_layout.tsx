import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(tabs-doctor)" />
        <Stack.Screen
          name="reports/[id]"
          options={{ headerShown: true, title: 'Report', presentation: 'modal' }}
        />
        <Stack.Screen
          name="queue/[id]"
          options={{ headerShown: true, title: 'Queue', presentation: 'modal' }}
        />
        <Stack.Screen
          name="preconsult/[appointmentId]"
          options={{ headerShown: true, title: 'Pre-Consultation', presentation: 'modal' }}
        />
      </Stack>
    </AuthProvider>
  );
}
