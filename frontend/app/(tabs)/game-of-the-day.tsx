import { StyleSheet, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Collapsible } from '@/components/Collapsible';

import Cards from '../../components/Cards';
// let gamess = [
//   {
//     _id: '677a52f79724aa2527e048e2',
//     uniqueId: 'NBA-NY-2025-01-12-1',
//     awayTeamId: 'DET',
//     awayTeamShort: 'DET',
//     awayTeam: 'Detroit Pistons',
//     homeTeamId: 'NY',
//     homeTeamShort: 'NY',
//     homeTeam: 'New York Knicks',
//     arenaName: 'Madison Square Garden',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-NY',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '1:30',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 01:30:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '677a530a9724aa2527e0624d',
//     uniqueId: 'NBA-LAC-2025-01-12-1',
//     awayTeamId: 'MIA',
//     awayTeamShort: 'MIA',
//     awayTeam: 'Miami Heat',
//     homeTeamId: 'LAC',
//     homeTeamShort: 'LAC',
//     homeTeam: 'LA Clippers',
//     arenaName: 'Intuit Dome',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-LAC',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '4:30',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 04:30:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '677a53029724aa2527e05917',
//     uniqueId: 'NBA-MIN-2025-01-12-1',
//     awayTeamId: 'MIN',
//     awayTeamShort: 'MIN',
//     awayTeam: 'Minnesota Timberwolves',
//     homeTeamId: 'WSH',
//     homeTeamShort: 'WSH',
//     homeTeam: 'Washington Wizards',
//     arenaName: 'Capital One Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-MIN',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '1:0',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 01:00:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '677a52ff9724aa2527e0560b',
//     uniqueId: 'NBA-MEM-2025-01-12-1',
//     awayTeamId: 'MEM',
//     awayTeamShort: 'MEM',
//     awayTeam: 'Memphis Grizzlies',
//     homeTeamId: 'HOU',
//     homeTeamShort: 'HOU',
//     homeTeam: 'Houston Rockets',
//     arenaName: 'Toyota Center',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-MEM',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '2:0',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 02:00:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '677a53099724aa2527e06148',
//     uniqueId: 'NBA-LAL-2025-01-12-1',
//     awayTeamId: 'SA',
//     awayTeamShort: 'SA',
//     awayTeam: 'San Antonio Spurs',
//     homeTeamId: 'LAL',
//     homeTeamShort: 'LAL',
//     homeTeam: 'Los Angeles Lakers',
//     arenaName: 'Crypto.com Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-LAL',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '4:30',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 04:30:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '677a53079724aa2527e05f38',
//     uniqueId: 'NBA-GS-2025-01-12-1',
//     awayTeamId: 'GS',
//     awayTeamShort: 'GS',
//     awayTeam: 'Golden State Warriors',
//     homeTeamId: 'TOR',
//     homeTeamShort: 'TOR',
//     homeTeam: 'Toronto Raptors',
//     arenaName: 'Scotiabank Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NBA-GS',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NBA',
//     venueTimezone: 'America/New_York',
//     timeStart: '1:30',
//     updateDate: 'Sun Jan 05 2025 10:34:49 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//     startTimeUTC: 'Tue Jan 14 2025 01:30:00 GMT+0100 (heure normale d’Europe centrale)',
//   },
//   {
//     _id: '678289fc0b596c521f229b7a',
//     uniqueId: 'NFL-DEN-2025-01-12-1',
//     awayTeamId: 'DEN',
//     awayTeamShort: 'DEN',
//     awayTeam: 'Denver Broncos',
//     homeTeamId: 'BUF',
//     homeTeamShort: 'BUF',
//     homeTeam: 'Buffalo Bills',
//     arenaName: 'Highmark Stadium',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NFL-DEN',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NFL',
//     venueTimezone: 'America/New_York',
//     timeStart: '12:00',
//     startTimeUTC: '2025-01-12T18:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '678289fc0b596c521f229b8c',
//     uniqueId: 'NFL-PIT-2025-01-12-1',
//     awayTeamId: 'PIT',
//     awayTeamShort: 'PIT',
//     awayTeam: 'Pittsburgh Steelers',
//     homeTeamId: 'BAL',
//     homeTeamShort: 'BAL',
//     homeTeam: 'Baltimore Ravens',
//     arenaName: 'M&T Bank Stadium',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NFL-PIT',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NFL',
//     venueTimezone: 'America/New_York',
//     timeStart: '19:00',
//     startTimeUTC: '2025-01-12T01:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '678289fc0b596c521f229b83',
//     uniqueId: 'NFL-PHI-2025-01-12-1',
//     awayTeamId: 'GB',
//     awayTeamShort: 'GB',
//     awayTeam: 'Green Bay Packers',
//     homeTeamId: 'PHI',
//     homeTeamShort: 'PHI',
//     homeTeam: 'Philadelphia Eagles',
//     arenaName: 'Lincoln Financial Field',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NFL-PHI',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NFL',
//     venueTimezone: 'America/New_York',
//     timeStart: '15:30',
//     startTimeUTC: '2025-01-12T21:30Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '67828a8f0b596c521f22e176',
//     uniqueId: 'NHL-DET-2025-01-12-1',
//     awayTeamId: 'SEA',
//     awayTeamShort: 'SEA',
//     awayTeam: 'Seattle',
//     homeTeamId: 'DET',
//     homeTeamShort: 'DET',
//     homeTeam: 'Detroit',
//     arenaName: 'Little Caesars Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NHL-DET',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NHL',
//     venueTimezone: 'America/Detroit',
//     timeStart: '15:00',
//     startTimeUTC: '2025-01-12T20:00:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '67828a950b596c521f22e4ca',
//     uniqueId: 'NHL-OTT-2025-01-12-1',
//     awayTeamId: 'DAL',
//     awayTeamShort: 'DAL',
//     awayTeam: 'Dallas',
//     homeTeamId: 'OTT',
//     homeTeamShort: 'OTT',
//     homeTeam: 'Ottawa',
//     arenaName: 'Canadian Tire Centre',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NHL-OTT',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NHL',
//     venueTimezone: 'US/Eastern',
//     timeStart: '17:00',
//     startTimeUTC: '2025-01-12T22:00:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '67828aae0b596c521f22eeac',
//     uniqueId: 'NHL-VGK-2025-01-12-1',
//     awayTeamId: 'MIN',
//     awayTeamShort: 'MIN',
//     awayTeam: 'Minnesota',
//     homeTeamId: 'VGK',
//     homeTeamShort: 'VGK',
//     homeTeam: 'Vegas',
//     arenaName: 'T-Mobile Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NHL-VGK',
//     show: 'true',
//     selectedTeam: 'true',
//     league: 'NHL',
//     venueTimezone: 'US/Pacific',
//     timeStart: '17:00',
//     startTimeUTC: '2025-01-13T01:00:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '67828aa90b596c521f22ecc9',
//     uniqueId: 'NHL-TBL-2025-01-12-1',
//     awayTeamId: 'TBL',
//     awayTeamShort: 'TBL',
//     awayTeam: 'Tampa Bay',
//     homeTeamId: 'PIT',
//     homeTeamShort: 'PIT',
//     homeTeam: 'Pittsburgh',
//     arenaName: 'PPG Paints Arena',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NHL-TBL',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NHL',
//     venueTimezone: 'US/Eastern',
//     timeStart: '17:00',
//     startTimeUTC: '2025-01-12T22:00:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
//   {
//     _id: '67828ab00b596c521f22ef9f',
//     uniqueId: 'NHL-ANA-2025-01-12-1',
//     awayTeamId: 'ANA',
//     awayTeamShort: 'ANA',
//     awayTeam: 'Anaheim',
//     homeTeamId: 'CAR',
//     homeTeamShort: 'CAR',
//     homeTeam: 'Carolina',
//     arenaName: 'Lenovo Center',
//     gameDate: '2025-01-12',
//     teamSelectedId: 'NHL-ANA',
//     show: 'false',
//     selectedTeam: 'false',
//     league: 'NHL',
//     venueTimezone: 'US/Eastern',
//     timeStart: '17:00',
//     startTimeUTC: '2025-01-12T22:00:00Z',
//     updateDate: 'Sat Jan 11 2025 16:08:05 GMT+0100 (heure normale d’Europe centrale)',
//     __v: 0,
//   },
// ];
const getGamesFromApi = async () => {
  const now = new Date();
  const YYYYMMDD = now.toISOString().split('T')[0];

  try {
    const response = await fetch(`http://localhost:3000/games/date/${YYYYMMDD}`);
    const todayGames = await response.json();

    console.log(todayGames);
    await setGames(todayGames);
    return;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default function gameOfTheDay() {
  const [games, setGames] = useState(0);
  const makeCards = () => {
    if (games && Array.isArray(games)) {
      return games.map((game) => {
        return <Cards key={game._id} data={game} />;
      });
    }
    return <ThemedText>Wait for it ....</ThemedText>;
  };

  useEffect(() => {
    getGamesFromApi();
  }, []);

  return (
    <>
      <ScrollView>
        <ThemedView>
          <Collapsible title="click me">
            <ThemedText>click</ThemedText>
          </Collapsible>
          {makeCards()}
        </ThemedView>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
