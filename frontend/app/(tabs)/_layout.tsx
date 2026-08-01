import { AuthProvider, useAuth } from '@/context/AuthContext';
import { fetchTeams, getCache, saveCache } from '@/utils/fetchData';
import { db } from '@/utils/firebaseConfig';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Tabs } from 'expo-router';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
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

  // Helper to apply Firestore data to local cache
  const applyFirestoreData = async (data: any) => {
    const hasFirestoreData =
      (Array.isArray(data.favoriteTeams) && data.favoriteTeams.length > 0) ||
      (Array.isArray(data.leaguesSelected) && data.leaguesSelected.length > 0) ||
      data.showScores !== undefined ||
      data.showPreviousScores !== undefined ||
      (Array.isArray(data.gameSelected) && data.gameSelected.length > 0) ||
      (data.teamsSelectedLeagues &&
        typeof data.teamsSelectedLeagues === 'object' &&
        Object.keys(data.teamsSelectedLeagues).length > 0);

    if (hasFirestoreData) {
      console.log('Firestore has data → restoring from Firestore');
      saveCache('favoriteTeams', data.favoriteTeams || []);
      saveCache('leaguesSelected', data.leaguesSelected || []);
      saveCache('showScores', data.showScores ?? false);
      saveCache('showPreviousScores', data.showPreviousScores ?? false);
      saveCache('gameSelected', data.gameSelected || []);
      if (data.teamsSelectedLeagues) saveCache('teamsSelectedLeagues', data.teamsSelectedLeagues);
      if (data.teamSelected) localStorage.setItem('teamSelected', data.teamSelected);
      if (data.leagueSelected) localStorage.setItem('leagueSelected', data.leagueSelected);
      if (data.startDate) localStorage.setItem('startDate', data.startDate);
      if (data.endDate) localStorage.setItem('endDate', data.endDate);
    } else {
      console.log('Firestore empty → pushing local data to Firestore');
      const localFavoriteTeams = getCache<string[]>('favoriteTeams') || [];
      const localLeaguesSelected = getCache<string[]>('leaguesSelected') || [];
      const localShowScores = getCache<boolean>('showScores') ?? false;
      const localShowPreviousScores = getCache<boolean>('showPreviousScores') ?? false;
      const localGameSelected = getCache<any[]>('gameSelected') || [];
      const localTeamsSelectedRaw = getCache<any[]>('teamsSelected') || [];
      const localStartDate = localStorage.getItem('startDate');
      const localEndDate = localStorage.getItem('endDate');
      const localTeamSelected = localStorage.getItem('teamSelected');
      const localLeagueSelected = localStorage.getItem('leagueSelected');
      const localTeamsSelected = localTeamsSelectedRaw.map((t) => t.uniqueId).filter(Boolean);
      const localTeamsSelectedLeagues = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};

      const userRef = doc(db, 'users', user!.uid);
      await setDoc(
        userRef,
        {
          lastLogin: serverTimestamp(),
          favoriteTeams: localFavoriteTeams,
          leaguesSelected: localLeaguesSelected,
          showScores: localShowScores,
          showPreviousScores: localShowPreviousScores,
          gameSelected: localGameSelected,
          teamsSelected: localTeamsSelected,
          teamsSelectedLeagues: localTeamsSelectedLeagues,
          startDate: localStartDate,
          endDate: localEndDate,
          teamSelected: localTeamSelected,
          leagueSelected: localLeagueSelected,
        },
        { merge: true },
      );
    }

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

    const userRef = doc(db, 'users', user.uid);

    // Set up real-time listener for Firestore changes
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          applyFirestoreData(data);
        }
        // Mark Firestore as ready after the first snapshot (initial sync)
        setFirestoreReady(true);
      },
      (err) => {
        console.error('Firestore snapshot error:', err);
        // Even on error, mark as ready so the app can still work with local data
        setFirestoreReady(true);
      },
    );

    return () => unsubscribe();
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
