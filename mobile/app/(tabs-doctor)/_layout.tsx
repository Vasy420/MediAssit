import { Tabs } from 'expo-router';

export default function DoctorTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="queue" options={{ title: 'Queue', tabBarLabel: 'Queue' }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients', tabBarLabel: 'Patients' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarLabel: 'Reports' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
