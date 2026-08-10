import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../src/contexts/SettingsContext';
import { radii, typography } from '../../src/ui/theme';

export default function DoctorTabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.ink,
        headerTitleStyle: typography.heading,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primaryDark,
        tabBarInactiveTintColor: theme.inkSubtle,
        tabBarActiveBackgroundColor: theme.primarySoft,
        tabBarLabelStyle: { ...typography.caption, fontSize: 11 },
        tabBarItemStyle: { borderRadius: radii.md, marginHorizontal: 3, marginVertical: 6 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarLabel: 'Home', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={focused ? size + 1 : size} color={color} /> }} />
      <Tabs.Screen name="queue" options={{ title: 'Queue', tabBarLabel: 'Queue', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'list' : 'list-outline'} size={focused ? size + 1 : size} color={color} /> }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients', tabBarLabel: 'Patients', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={focused ? size + 1 : size} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarLabel: 'Reports', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={focused ? size + 1 : size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={focused ? size + 1 : size} color={color} /> }} />
    </Tabs>
  );
}
