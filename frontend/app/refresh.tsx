import AppLogo from '@/components/AppLogo';
import NoResults from '@/components/NoResults';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { leagueLogos } from '@/constants/enum';
import {
  fetchLeagues,
  refreshGamesLeague as refreshGamesLeagueApi,
  refreshTeams as refreshTeamsApi,
} from '@/utils/fetchData';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import LoadingView from '../components/LoadingView';

let width: number;

export default function GameofTheDay() {
  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = useRef(null);

  const handleFetchLeagues = async () => {
    setIsLoading(true);
    try {
      await fetchLeagues(setLeaguesAvailable);
    } catch (error) {
      console.error('Error in handleFetchLeagues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshGamesLeague = async (league: string) => {
    setIsLoading(true);
    try {
      await refreshGamesLeagueApi(league);
    } catch (error) {
      console.error('Error refreshing games for league:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTeams = async () => {
    setIsLoading(true);
    try {
      await refreshTeamsApi('teams/refresh');
    } catch (error) {
      console.error('Error refreshing teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshScores = async () => {
    setIsLoading(true);
    try {
      await refreshTeamsApi('games/scores');
    } catch (error) {
      console.error('Error refreshing teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { width: windowWidth } = useWindowDimensions();
  width = windowWidth;
  const isTwoColumns = leaguesAvailable.length > 6 && width >= 700;
  const gridTemplateColumns = isTwoColumns ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, 1fr)';
  const containerMaxWidth = isTwoColumns ? '600px' : width < 700 ? '90%' : '300px';
  const buttonMaxWidth = isTwoColumns ? '300px' : width < 700 ? '100%' : '300px';

  const topGridTemplateColumns = width < 700 ? 'repeat(1, 1fr)' : 'repeat(2, minmax(0, 1fr))';
  const topContainerMaxWidth = width < 700 ? '90%' : '600px';
  const topButtonMaxWidth = width < 700 ? '100%' : '300px';
  const buttonHeight = width < 700 ? '70px' : '50px';
  const gap = width < 700 ? '20px' : '50px';

  const displayNoContent = () => {
    if (isLoading) {
      return <LoadingView />;
    } else {
      return <NoResults />;
    }
  };

  useEffect(() => {
    async function getLeagues() {
      await handleFetchLeagues();
    }
    getLeagues();
  }, []);
  if (leaguesAvailable.length === 0) {
    return displayNoContent();
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView ref={scrollViewRef} scrollEventThrottle={16}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 15px 0 15px',
          }}
        >
          <AppLogo />
        </div>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            padding: '20px',
          }}
        >
          <View
            style={
              {
                display: 'grid',
                gridTemplateColumns: topGridTemplateColumns,
                gap,
                width: '100%',
                maxWidth: topContainerMaxWidth,
                alignItems: 'center',
                justifyItems: 'center',
              } as any
            }
          >
            <div
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-disabled={isLoading}
              onClick={() => !isLoading && handleRefreshTeams()}
              onKeyDown={(e) => {
                if (isLoading) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRefreshTeams();
                }
              }}
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
                width: '100%',
                maxWidth: topButtonMaxWidth,
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: buttonHeight,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <ThemedText
                  style={{ color: '#fff', fontSize: '16px', marginRight: 10, textAlign: 'center', flexShrink: 1 }}
                >
                  TEAMS
                </ThemedText>
              </View>
            </div>
            <div
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-disabled={isLoading}
              onClick={() => !isLoading && handleRefreshScores()}
              onKeyDown={(e) => {
                if (isLoading) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRefreshScores();
                }
              }}
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
                width: '100%',
                maxWidth: topButtonMaxWidth,
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: buttonHeight,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <ThemedText
                  style={{ color: '#fff', fontSize: '16px', marginRight: 10, textAlign: 'center', flexShrink: 1 }}
                >
                  SCORES
                </ThemedText>
              </View>
            </div>
          </View>
          <br />
          <hr style={{ width: '300px' }} />
          <br />

          {/* Grid container for league buttons */}
          <View
            style={
              {
                display: 'grid',
                gridTemplateColumns: gridTemplateColumns,
                gap,
                width: '100%',
                maxWidth: containerMaxWidth,
                alignItems: 'center',

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
                <div
                  role="button"
                  tabIndex={isLoading ? -1 : 0}
                  aria-disabled={isLoading}
                  onClick={() => !isLoading && handleRefreshGamesLeague(league)}
                  onKeyDown={(e) => {
                    if (isLoading) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRefreshGamesLeague(league);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',

                    border: '1px solid #ddd',

                    backgroundColor: isLoading ? '#ccc' : '#007bff',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    transition: 'background 0.2s',
                    minWidth: isTwoColumns || width < 700 ? '100px' : '300px',
                    maxWidth: buttonMaxWidth,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: buttonHeight,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <ThemedText
                      style={{ color: '#fff', fontSize: '16px', marginRight: 10, textAlign: 'center', flexShrink: 1 }}
                    >
                      {league.replace('-', ' ').toUpperCase()}
                    </ThemedText>
                    <Image
                      source={leagueLogos[league.toUpperCase()] || leagueLogos.DEFAULT}
                      style={{ height: 20, width: 40, resizeMode: 'contain' }}
                      accessibilityLabel={`${league} logo`}
                    />
                  </View>
                </div>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
