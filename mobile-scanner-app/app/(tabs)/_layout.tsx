import { Tabs } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#14F195',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#000', borderTopColor: '#222' },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Escáner QR',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="qr-code-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Panel Admin',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="briefcase-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => <FontAwesome5 name="user-astronaut" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}