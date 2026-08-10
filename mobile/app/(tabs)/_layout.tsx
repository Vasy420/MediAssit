import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../src/contexts/SettingsContext';
import { radii, typography } from '../../src/ui/theme';

export default function TabLayout() {
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={focused ? size + 1 : size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'Symptom Check',
          tabBarLabel: 'Check',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={focused ? size + 1 : size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Doctors',
          tabBarLabel: 'Doctors',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'medical' : 'medical-outline'} size={focused ? size + 1 : size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarLabel: 'Appts',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={focused ? size + 1 : size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={focused ? size + 1 : size} color={color} />,
        }}
      />
    </Tabs>
  );
}
