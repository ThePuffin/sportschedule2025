import { translateWord } from '@/utils/utils';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Icon from 'react-native-vector-icons/FontAwesome';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: (colorScheme ?? 'light') === 'dark' ? '#8E8E93' : '#404040',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: translateWord('gamesOfDay'),
          tabBarIcon: ({ color }) => <Icon size={28} name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: translateWord('remainingGames'),
          tabBarIcon: ({ color }) => <Icon size={28} name="table" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: translateWord('calendars'),
          tabBarIcon: ({ color }) => <Icon size={28} name="calendar" color={color} />,
        }}
      />
    </Tabs>
  );
}
