import Selector from '@/components/Selector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getRandomTeamId, randomNumber, translateWord } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';
import Accordion from '../../components/Accordion'; // Added import
import Loader from '../../components/Loader';
import {
  fetchLeagues,
  fetchRemainingGamesByLeague,
  fetchRemainingGamesByTeam,
  fetchTeams,
  smallFetchRemainingGamesByLeague,
} from '../../utils/fetchData';
import { FilterGames, GameFormatted, Team } from '../../utils/types';

export default function Schedule() {
  const [games, setGames] = useState<FilterGames>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSelected, setTeamSelected] = useState<string>('');
  const [leagueTeams, setLeagueTeams] = useState<Team[]>([]);
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [leaguesAvailable, setLeaguesAvailable] = useState<string[]>([]);
  const [leagueOfSelectedTeam, setleagueOfSelectedTeam] = useState<string>('');

  const allOption = {
    uniqueId: 'all',
    label: 'All',
    id: 'all',
    value: 'all',
    teamLogo: '',
    teamCommonName: 'All',
    conferenceName: '',
    divisionName: '',
    league: leagueOfSelectedTeam,
    abbrev: 'ALL',
    updateDate: '',
  } as Team;

  useEffect(() => {
    async function fetchTeamsAndRestore() {
      // try cached teams first
      const cachedTeamsRaw = localStorage.getItem('teams');
      const cachedTeams = safeParse<Team[]>(cachedTeamsRaw);
      const teamSelected = localStorage.getItem('teamSelected') || '';
      const selectedTeam = cachedTeams?.find((t) => t.uniqueId === teamSelected) || ({} as Team);

      try {
        if (cachedTeams) {
          setTeams([selectedTeam]);
          setLeaguesAvailable([selectedTeam.league]);
          getSelectedTeams(cachedTeams);
        }
        const teamsData: Team[] = await fetchTeams();
        setTeams(teamsData);
        // cache teams for offline/cold-start
        localStorage.setItem('teams', JSON.stringify(teamsData));
        // restore selection using freshly fetched teams
        getSelectedTeams(teamsData);
      } catch (err) {
        console.error('fetch teams failed, using cached teams if available', err);
        if (cachedTeams) {
          setTeams(cachedTeams);
          getSelectedTeams(cachedTeams);
        } else {
          // fallback: try to restore selection from persisted keys (teams unknown)
          getStoredData();
        }
      }
      // optionally fetch leagues
      if (leaguesAvailable.length === 0) {
        fetchLeagues(setLeaguesAvailable);
      }
    }
    fetchTeamsAndRestore();
  }, []);

  useEffect(() => {
    if (teamSelected.length > 0) {
      async function fetchGames() {
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamSelected]);

  useEffect(() => {
    if (leaguesAvailable.length === 0) {
      fetchLeagues(setLeaguesAvailable);
    }
  }, []);

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');
      if (width <= 1075) {
        setIsSmallDevice(true);
      } else {
        setIsSmallDevice(false);
      }
    };

    updateDeviceType();
  }, []);

  const getSelectedTeams = (allTeams: Team[]) => {
    let selection = localStorage.getItem('teamSelected') || '';
    if (selection.length === 0) {
      const selectedTeams = localStorage.getItem('teamsSelected') || '';

      let teamsSelectedIds = selectedTeams.length > 0 ? JSON.parse(selectedTeams) : [];
      let randomTeam = getRandomTeamId(allTeams) || '';

      if (teamsSelectedIds.length > 0) {
        selection = teamsSelectedIds[0]?.uniqueId || randomTeam;
      } else {
        selection = randomTeam;
      }
    }
    // pass the freshly fetched teams so we can derive league immediately
    storeTeamSelected(selection, allTeams);
  };

  const getStoredData = () => {
    const leagueSelection = localStorage.getItem('leagueSelected') ?? '';
    setleagueOfSelectedTeam(leagueSelection);
    const teamSelection = localStorage.getItem('teamSelected') ?? '';
    if (teamSelection) {
      // if called when teams are already loaded, pass them to derive league
      storeTeamSelected(teamSelection, teams);
      const scheduleData = localStorage.getItem('scheduleData');
      if (scheduleData) {
        const storedGames = JSON.parse(scheduleData);
        const today = new Date().toISOString().split('T')[0];
        const filteredGames = Object.fromEntries(
          Object.entries(storedGames)
            .filter(([date]) => date >= today)
            .map(([date, games]) => [date, games as GameFormatted[]])
        ) as FilterGames;
        setGames(filteredGames);
      }
    } else {
      setTeamSelected(teamSelection);
    }
  };

  const persistTeamForLeague = (league: string, teamSelectedId: string) => {
    const storedTeamsLeagues = localStorage.getItem('teamsSelectedLeagues') || '{}';
    const leaguesTeams: { [key: string]: string } = JSON.parse(storedTeamsLeagues);
    leaguesTeams[league] = teamSelectedId;
    localStorage.setItem('teamsSelectedLeagues', JSON.stringify(leaguesTeams));
  };

  const handleTeamSelectionChange = (teamSelectedId: string, i: number) => {
    if (teamSelectedId === 'all') {
      localStorage.setItem('teamSelected', 'all');
      setTeamSelected('all');
    } else {
      storeTeamSelected(teamSelectedId);
    }
    persistTeamForLeague(leagueOfSelectedTeam, teamSelectedId);
  };

  const handleLeagueSelectionChange = (leagueSelectedId: string, i: number) => {
    localStorage.setItem('leagueSelected', leagueSelectedId);
    const teamsAvailableInLeague = teams.filter(({ league }) => league === leagueSelectedId);
    allOption.league = leagueSelectedId;
    setLeagueTeams([allOption, ...teamsAvailableInLeague]);
    setleagueOfSelectedTeam(leagueSelectedId);
    const storedTeamsLeagues = JSON.parse(localStorage.getItem('teamsSelectedLeagues') || '{}');
    let team = '';
    if (storedTeamsLeagues[leagueSelectedId]) {
      team = storedTeamsLeagues[leagueSelectedId];
    }

    if (team.length === 0) {
      team = teamsAvailableInLeague.length
        ? teamsAvailableInLeague[randomNumber(teamsAvailableInLeague.length - 1)].uniqueId
        : 'all';
    }
    localStorage.setItem('teamSelected', team);
    setTeamSelected(team);
  };

  const display = () => {
    const leagues = leaguesAvailable || [];

    const dataLeagues = {
      i: randomNumber(999999),
      items: leagues,
      itemsSelectedIds: [],
      itemSelectedId: leagueOfSelectedTeam,
    };

    const teamsForSelector = leagueTeams;
    const dataTeams = {
      i: randomNumber(999999),
      items: teamsForSelector,
      itemsSelectedIds: [],
      itemSelectedId: teamSelected,
    };
    return (
      <td key={`${teamSelected}-${teamSelected.length}`}>
        <ThemedView>
          <div style={{ width: isSmallDevice ? '100%' : '50%', margin: '0 auto', alignContent: 'center' }}>
            <Selector data={dataLeagues} onItemSelectionChange={handleLeagueSelectionChange} />
            <Selector data={dataTeams} onItemSelectionChange={handleTeamSelectionChange} />
          </div>
          {displayGamesCards(teamSelected)}
        </ThemedView>
      </td>
    );
  };

  const displayGamesCards = (teamSelectedId: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (!games || (Object.keys(games).length === 1 && (games[today]?.[0]?.updateDate ?? '')) === '') {
      return (
        <div>
          <br />
          <ThemedText>{translateWord('noResults')}</ThemedText>
        </div>
      );
    } else if (games) {
      const filteredGames = Object.keys(games).filter((day: string) => {
        return games[day]?.some((game: GameFormatted) => game.updateDate);
      });

      const months = filteredGames.reduce((acc: { [key: string]: string[] }, day: string) => {
        const month = new Date(day).toLocaleString('default', { month: 'long' });
        if (!acc[month]) {
          acc[month] = [];
        }
        acc[month].push(day);
        return acc;
      }, {});

      if (Object.keys(months).length) {
        return Object.entries(months).map(([month, daysInMonth], monthIndex) => {
          const gamesForThisMonth: GameFormatted[] = daysInMonth.reduce((acc: GameFormatted[], day: string) => {
            if (teamSelectedId === 'all') {
              if (games[day]) {
                acc.push(...games[day]);
              }
            } else {
              const gameOnDay = games[day]?.find((game: GameFormatted) => game.teamSelectedId === teamSelectedId);
              if (gameOnDay) {
                acc.push(gameOnDay);
              }
            }
            return acc;
          }, []);

          if (gamesForThisMonth.length === 0) {
            return null;
          }
          return (
            <div key={month} style={{ width: isSmallDevice ? '100%' : '50%', margin: '0 auto' }}>
              <Accordion
                filter={month}
                i={monthIndex}
                gamesFiltred={gamesForThisMonth}
                open={monthIndex === 0}
                showDate={true}
                isCounted={true}
              />
            </div>
          );
        });
      }
    }
    return Object.keys(games).length ? (
      <div>
        <br />
        <ThemedText>{translateWord('noResults')}</ThemedText>
      </div>
    ) : (
      <div>
        <Loader />
      </div>
    );
  };

  const getGamesFromApi = async (): Promise<FilterGames> => {
    if (teamSelected && teamSelected.length !== 0) {
      try {
        let scheduleData: FilterGames;
        const scheduleDataStored = JSON.parse(localStorage.getItem('scheduleData') || '{}');
        const scheduleKeys = Object.keys(scheduleDataStored);
        let thisLeagueTeams = JSON.parse(JSON.stringify(leagueTeams));
        if (scheduleKeys) {
          const scheduleTeam = scheduleDataStored[scheduleKeys[0]]?.[0]?.teamSelectedId;
          const scheduleLeague = scheduleDataStored[scheduleKeys[0]]?.[0]?.league;
          const teamSelected = localStorage.getItem('teamSelected') || '';
          if (scheduleTeam === teamSelected || (teamSelected === 'all' && scheduleLeague === leagueOfSelectedTeam)) {
            setGames(scheduleDataStored);
          } else {
            setGames({});
          }
          setLeagueTeams([]);
        }
        if (teamSelected === 'all') {
          const storedLeague = localStorage.getItem('leagueSelected');
          const selectionLeague = storedLeague || leaguesAvailable[0];
          const smallScheduleData = await smallFetchRemainingGamesByLeague(selectionLeague);
          localStorage.setItem('scheduleData', JSON.stringify(smallScheduleData));
          setGames(smallScheduleData);
          setleagueOfSelectedTeam(selectionLeague);
          scheduleData = await fetchRemainingGamesByLeague(selectionLeague);
        } else {
          scheduleData = await fetchRemainingGamesByTeam(teamSelected);
        }
        setLeagueTeams(thisLeagueTeams);
        fetchLeagues(setLeaguesAvailable) || leaguesAvailable;
        if (Object.keys(scheduleData).length === 0) {
          const now = new Date().toISOString().split('T')[0];
          scheduleData[now] = [];
        }

        localStorage.setItem('scheduleData', JSON.stringify(scheduleData));

        setGames(scheduleData);
      } catch (error) {
        console.error('fetch games failed, using cached schedule if available', error);
        const scheduleDataRaw = localStorage.getItem('scheduleData');
        const scheduleData = safeParse<FilterGames>(scheduleDataRaw);
        if (scheduleData) setGames(scheduleData);
      }
    } else {
      // if no team selected yet, try to restore cached schedule so UI can show something
      const scheduleDataRaw = localStorage.getItem('scheduleData');
      if (scheduleDataRaw) {
        try {
          setGames(JSON.parse(scheduleDataRaw));
        } catch (e) {
          console.error('cached schedule parse failed', e);
        }
      }
    }
    return {};
  };

  const storeTeamSelected = (teamSelection: string, teamsList?: Team[]) => {
    if (!teamSelection) {
      setTeamSelected('');
      localStorage.removeItem('teamSelected');
      setLeagueTeams([]);
      setleagueOfSelectedTeam('');
      return;
    }

    const list = teamsList ?? teams;
    let newLeague = '';
    if (teamSelection === 'all') {
      newLeague = localStorage.getItem('leagueSelected') || '';
    } else {
      newLeague = list.find((t) => t.uniqueId === teamSelection)?.league ?? '';
    }

    // persist immediately
    localStorage.setItem('teamSelected', teamSelection);
    if (newLeague) {
      localStorage.setItem('leagueSelected', newLeague);
    }

    // update state once with derived values
    setTeamSelected(teamSelection);
    setleagueOfSelectedTeam(newLeague);
    const leagueFilter = list.filter(({ league }) => league === newLeague);
    allOption.league = newLeague;
    setLeagueTeams([allOption, ...leagueFilter]);
  };

  function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error('safeParse failed', e);
      return null;
    }
  }

  return (
    <ScrollView>
      {!teamSelected.length && (
        <View style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loader />
        </View>
      )}
      {display()}
    </ScrollView>
  );
}
