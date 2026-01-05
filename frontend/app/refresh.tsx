import NoResults from '@/components/NoResults';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  fetchLeagues,
  refreshGamesLeague as refreshGamesLeagueApi,
  refreshTeams as refreshTeamsApi,
} from '@/utils/fetchData';
import React, { useEffect, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import LoadingView from '../components/LoadingView';

let width: number;

const leagueLogos = {
  MLB: require('../assets/images/MLB.png'),
  NBA: require('../assets/images/NBA.png'),
  NFL: require('../assets/images/NFL.png'),
  NHL: require('../assets/images/NHL.png'),
  WNBA: require('../assets/images/WNBA.png'),
  MLS: require('../assets/images/MLS.png'),
  PWHL: require('../assets/images/PWHL.png'),
  NCAAF: require('../assets/images/ncaa-football.png'),
  NCAAB: require('../assets/images/ncaa-basketball.png'),
  NCCABB: require('../assets/images/ncaa-baseball.png'),
  WNCAAB: require('../assets/images/ncaa-basketball-woman.png'),
  DEFAULT: require('../assets/images/DEFAULT.png'),
};

export default function GameofTheDay() {
  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      await refreshTeamsApi();
    } catch (error) {
      console.error('Error refreshing teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { width: windowWidth } = useWindowDimensions();
  width = windowWidth;
  const isTwoColumns = leaguesAvailable.length > 6;
  const gridTemplateColumns = isTwoColumns ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, 1fr)';
  const containerMaxWidth = isTwoColumns ? (width < 700 ? '70%' : '500px') : '300px';
  const buttonMaxWidth = isTwoColumns ? (width < 700 ? '100%' : '300px') : width < 600 ? '100%' : '300px';

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
    <ThemedView>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          minHeight: '100vh',
          padding: '20px',
        }}
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
            maxWidth: buttonMaxWidth,
            minWidth: buttonMaxWidth === '100%' ? undefined : '300px',
            display: 'block',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText style={{ color: '#fff', fontSize: '16px', marginRight: 10 }}>TEAMS</ThemedText>
          </View>
        </div>
        <br />
        <hr style={{ width: '300px' }} />
        <br />

        {/* Grid container for league buttons */}
        <View
          style={
            {
              display: 'grid',
              gridTemplateColumns: gridTemplateColumns,
              gap: '25px',
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
                  border: 'none',
                  backgroundColor: isLoading ? '#ccc' : '#007bff',
                  color: '#fff',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  transition: 'background 0.2s',
                  minWidth: isTwoColumns ? '100px' : '300px',
                  maxWidth: buttonMaxWidth,
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
              </div>
            </View>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}
