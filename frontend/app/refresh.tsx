import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import Loader from '../components/Loader';
import { translateWord } from '../utils/utils';

let width: number;
const EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sportschedule2025backend.onrender.com';

const leagueLogos = {
  MLB: require('../assets/images/MLB.png'),
  NBA: require('../assets/images/NBA.png'),
  NFL: require('../assets/images/NFL.png'),
  NHL: require('../assets/images/NHL.png'),
  WNBA: require('../assets/images/WNBA.png'),
  DEFAULT: require('../assets/images/DEFAULT.png'),
};

export default function GameofTheDay() {
  const fetchLeagues = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/teams/leagues`);
      const leagues = await response.json();
      setLeaguesAvailable(leagues);
      return;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshGamesLeague = async (league: string): Promise<void> => {
    console.log(`Refreshing games for league: ${league}`);
    setIsLoading(true);

    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/games/refresh/${league.toUpperCase()}`, {
        method: 'POST',
      });
      console.log(`Response status for ${league}:`, response);
      return;
    } catch (error) {
      console.error(`Error fetching games for ${league}:`, error);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTeams = async (): Promise<void> => {
    console.log(`Refreshing teams for all leagues`);
    setIsLoading(true);

    try {
      const response = await fetch(`${EXPO_PUBLIC_API_BASE_URL}/teams/refresh`, {
        method: 'POST',
      });
      console.log(`Response status for teams:`, response);
      return;
    } catch (error) {
      console.error(`Error fetching games for teams:`, error);
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { width: windowWidth } = useWindowDimensions();
  width = windowWidth;

  const displayNoContent = () => {
    if (isLoading) {
      return (
        <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader />
        </View>
      );
    } else {
      return <ThemedText>{translateWord('noResults')}</ThemedText>;
    }
  };

  useEffect(() => {
    async function getLeagues() {
      await fetchLeagues();
    }
    getLeagues();
  }, []);
  if (leaguesAvailable.length === 0) {
    return displayNoContent();
  }

  return (
    <ThemedView>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '100vh',
        }}
      >
        <button
          onClick={() => refreshTeams()}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: '#fff',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            transition: 'background 0.2s',
            width: width < 600 ? '100%' : '300px',
            maxWidth: '300px',
            minWidth: '300px',
            display: 'block',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText style={{ color: '#fff', fontSize: '16px', marginRight: 10 }}>TEAMS</ThemedText>
          </View>
        </button>
        <br />
        <hr style={{ width: '300px' }} />

        {/* Grid container for league buttons */}
        <View
          style={
            {
              display: 'grid',
              gridTemplateColumns: leaguesAvailable.length > 6 ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
              gap: '25px',
              width: '100%',
              maxWidth: leaguesAvailable.length > 6 ? '700px' : '300px',
              padding: '20px',
              justifyItems: 'center',
            } as any
          }
        >
          {leaguesAvailable.map((league) => (
            <View
              key={league}
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <button
                onClick={() => refreshGamesLeague(league)}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isLoading ? '#ccc' : '#007bff',
                  color: '#fff',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'background 0.2s',
                  width: width < 600 ? '100%' : '300px',
                  maxWidth: '300px',
                  minWidth: '300px',
                  display: 'block',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText style={{ color: '#fff', fontSize: '16px', marginRight: 10 }}>
                    {league.toUpperCase()}
                  </ThemedText>
                  <Image
                    source={leagueLogos[league.toUpperCase()] || leagueLogos.DEFAULT}
                    style={{ height: 20, width: 40, resizeMode: 'contain' }}
                    accessibilityLabel={`${league} logo`}
                  />
                </View>
              </button>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}
