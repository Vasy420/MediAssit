import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { useSettings } from '../src/contexts/SettingsContext';
import { typography } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
      <RootStack />
      </SettingsProvider>
    </AuthProvider>
  );
}

function RootStack() {
  const { theme, themeName } = useSettings();

  return (
      <>
      <StatusBar style={themeName === 'midnight' ? 'light' : 'dark'} backgroundColor={theme.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(tabs-doctor)" />
        <Stack.Screen name="patient-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="doctor/[id]"
          options={{
            headerShown: true,
            title: 'Doctor Profile',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.ink,
            headerTitleStyle: typography.heading,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reports/[id]"
          options={{
            headerShown: true,
            title: 'Report',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.ink,
            headerTitleStyle: typography.heading,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="queue/[id]"
          options={{
            headerShown: true,
            title: 'Queue',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.ink,
            headerTitleStyle: typography.heading,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="preconsult/[appointmentId]"
          options={{
            headerShown: true,
            title: 'Pre-Consultation',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.ink,
            headerTitleStyle: typography.heading,
            headerShadowVisible: false,
          }}
        />
      </Stack>
      </>
  );
}
