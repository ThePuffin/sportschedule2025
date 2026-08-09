import { AuthProvider, useAuth } from '@/context/AuthContext';
import { fetchTeams, getCache, saveCache } from '@/utils/fetchData';
import { db } from '@/utils/firebaseConfig';
import { applyFirestoreDataToLocal, flushSync, syncOnLogin } from '@/utils/syncService';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Tabs } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Icon from 'react-native-vector-icons/FontAwesome';

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, setFirestoreReady } = useAuth();

  // Helper to apply Firestore data to local cache and refresh the UI
  const applyFirestoreData = async (data: any) => {
    applyFirestoreDataToLocal(data);

    let allTeams = getCache<Team[]>('teams') || [];
    if (allTeams.length === 0) {
      allTeams = await fetchTeams();
      saveCache('teams', allTeams);
    }

    const dbTeamsSelectedIds: string[] = Array.isArray(data?.teamsSelected) ? data.teamsSelected : [];
    if (dbTeamsSelectedIds.length > 0 && allTeams.length > 0) {
      const fullTeamsSelected: Team[] = dbTeamsSelectedIds
        .map((id: string) => allTeams.find((t: Team) => t.uniqueId === id))
        .filter((t: Team | undefined): t is Team => !!t);
      if (fullTeamsSelected.length > 0) saveCache('teamsSelected', fullTeamsSelected);
    }

    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
      globalThis.window.dispatchEvent(new Event('leaguesUpdated'));
      globalThis.window.dispatchEvent(new Event('scoresUpdated'));
      globalThis.window.dispatchEvent(new Event('gamesSelectedUpdated'));
      globalThis.window.dispatchEvent(new Event('dateRangeUpdated'));
      globalThis.window.dispatchEvent(new Event('teamsSelectedUpdated'));
    }
  };

  useEffect(() => {
    if (!user) {
      // No user logged in → mark Firestore as ready immediately (nothing to sync)
      setFirestoreReady(true);
      return;
    }

    let isMounted = true;

    // Flush any pending debounced writes from a previous session before
    // starting the new user's sync, so no local changes are lost on user switch.
    flushSync();

    // Initial login sync:
    // - Firestore has data → overwrite localStorage with it
    // - No Firestore data → push localStorage to Firestore
    // - Firestore error → fall back to localStorage (no-op)
    syncOnLogin(user.uid).finally(() => {
      if (isMounted) setFirestoreReady(true);
    });

    // Real-time listener for updates from other devices
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          applyFirestoreData(data);
        }
      },
      (err) => {
        console.error('Firestore snapshot error:', err);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

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
