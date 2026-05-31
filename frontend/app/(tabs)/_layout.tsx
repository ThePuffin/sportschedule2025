import { AuthProvider, useAuth } from '@/context/AuthContext';
import { translateWord } from '@/utils/utils';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Icon from 'react-native-vector-icons/FontAwesome';

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

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
          title: translateWord('focusTeam'),
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
      <Tabs.Screen
        name="connection"
        options={{
          title: user ? translateWord('profile') : translateWord('connection'),
          tabBarIcon: ({ color }) =>
            user?.photoURL ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  overflow: 'hidden',
                  borderWidth: 1.5,
                  borderColor: color,
                  backgroundColor: 'rgba(128,128,128,0.1)',
                }}
              >
                <Image source={{ uri: user.photoURL }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              </View>
            ) : (
              <Icon size={28} name="user" color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <TabLayoutContent />
    </AuthProvider>
  );
}
