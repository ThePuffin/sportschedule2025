import NoResults from '@/components/NoResults';
import Selector from '@/components/Selector';
import { ThemedView } from '@/components/ThemedView';
import { getRandomTeamId, randomNumber } from '@/utils/utils';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import Accordion from '../../components/Accordion'; // Added import
import Loader from '../../components/Loader';
import LoadingView from '../../components/LoadingView';
import { ScrollToTopButton, ScrollToTopButtonRef } from '../../components/ScrollToTopButton';
import {
  fetchLeagues,
  fetchRemainingGamesByLeague,
  fetchRemainingGamesByTeam,
  fetchTeams,
  getCache,
  saveCache,
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
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToTopButtonRef = useRef<ScrollToTopButtonRef>(null);

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
      const cachedTeams = getCache<Team[]>('teams');
      const teamSelectedLS = localStorage.getItem('teamSelected') || '';
      const selectedTeam = cachedTeams?.find((t) => t.uniqueId === teamSelectedLS) || ({} as Team);

      try {
        if (cachedTeams) {
          setTeams([selectedTeam]);
          setLeaguesAvailable([selectedTeam.league]);
          getSelectedTeams(cachedTeams);
        }
        const teamsData: Team[] = await fetchTeams();
        setTeams(teamsData);
        // cache teams for offline/cold-start
        saveCache('teams', teamsData);
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
    if (teamSelected && teamSelected.length > 0 && leagueOfSelectedTeam && leagueOfSelectedTeam.length > 0) {
      async function fetchGames() {
        await getGamesFromApi();
      }
      fetchGames();
    }
  }, [teamSelected]);

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
      const teamsSelected = getCache<Team[]>('teamsSelected');

      let teamsSelectedIds = teamsSelected || [];
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
      const scheduleData = getCache<FilterGames>('scheduleData');
      if (scheduleData) {
        const storedGames = scheduleData;
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
    const leaguesTeams = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};
    leaguesTeams[league] = teamSelectedId;
    saveCache('teamsSelectedLeagues', leaguesTeams);
  };

  const handleTeamSelectionChange = (teamSelectedId: string | string[], i: number) => {
    const finalTeamId = Array.isArray(teamSelectedId) ? teamSelectedId[0] : teamSelectedId;
    if (finalTeamId === 'all') {
      localStorage.setItem('teamSelected', 'all');
      setTeamSelected('all');
    } else {
      storeTeamSelected(finalTeamId);
    }
    persistTeamForLeague(leagueOfSelectedTeam, finalTeamId);
  };

  const handleLeagueSelectionChange = (leagueSelectedId: string | string[], i: number) => {
    const finalLeagueId = Array.isArray(leagueSelectedId) ? leagueSelectedId[0] : leagueSelectedId;
    localStorage.setItem('leagueSelected', finalLeagueId);
    const teamsAvailableInLeague = teams.filter(({ league }) => league === finalLeagueId);
    allOption.league = finalLeagueId;
    setLeagueTeams([allOption, ...teamsAvailableInLeague]);
    setleagueOfSelectedTeam(finalLeagueId);
    const storedTeamsLeagues = getCache<{ [key: string]: string }>('teamsSelectedLeagues') || {};
    let team = '';
    if (storedTeamsLeagues[finalLeagueId]) {
      team = storedTeamsLeagues[finalLeagueId];
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
      <div key={`${teamSelected}-${teamSelected.length}`}>
        <ThemedView>
          <div style={{ width: isSmallDevice ? '100%' : '50%', margin: '0 auto', alignContent: 'center' }}>
            <Selector data={dataLeagues} onItemSelectionChange={handleLeagueSelectionChange} isClearable={false} />
            <Selector data={dataTeams} onItemSelectionChange={handleTeamSelectionChange} isClearable={false} />
          </div>
          {displayGamesCards(teamSelected)}
        </ThemedView>
      </div>
    );
  };

  const displayGamesCards = (teamSelectedId: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (!games || (Object.keys(games).length === 1 && (games[today]?.[0]?.updateDate ?? '')) === '') {
      return (
        <div>
          <br />
          <NoResults />
        </div>
      );
    } else if (games) {
      const filteredGames = Object.keys(games).filter((day: string) => {
        return Array.isArray(games[day]) && games[day].some((game: GameFormatted) => game.updateDate);
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
            const dayGames = Array.isArray(games[day]) ? games[day] : [];
            if (teamSelectedId === 'all') {
              if (dayGames.length) {
                acc.push(...dayGames);
              }
            } else {
              const gameOnDay = dayGames.find((game: GameFormatted) => game.teamSelectedId === teamSelectedId);
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
        <NoResults />
      </div>
    ) : (
      <div>
        <Loader />
      </div>
    );
  };

  const removeOldGames = (games: FilterGames) => {
    const today = new Date().toISOString().split('T')[0];
    const keys = Object.keys(games);
    keys.forEach((key) => {
      if (key < today) {
        delete games[key];
      }
    });
    return games;
  };

  const getGamesFromApi = async (): Promise<FilterGames> => {
    if (teamSelected && teamSelected.length !== 0) {
      try {
        let scheduleData: FilterGames;
        const scheduleDataStored = getCache<FilterGames>('scheduleData') || {};
        const scheduleKeys = Object.keys(scheduleDataStored);
        let thisLeagueTeams = JSON.parse(JSON.stringify(leagueTeams));
        if (scheduleKeys) {
          const scheduleTeam = scheduleDataStored[scheduleKeys[0]]?.[0]?.teamSelectedId;
          const scheduleLeague = scheduleDataStored[scheduleKeys[0]]?.[0]?.league;
          const teamSelected = localStorage.getItem('teamSelected') || '';
          if (scheduleTeam === teamSelected || (teamSelected === 'all' && scheduleLeague === leagueOfSelectedTeam)) {
            setGames(removeOldGames(scheduleDataStored));
          } else {
            setGames({});
          }
          setLeagueTeams([]);
        }
        if (teamSelected === 'all') {
          const storedLeague = localStorage.getItem('leagueSelected');
          const selectionLeague = storedLeague || leaguesAvailable[0];
          const smallScheduleData = await smallFetchRemainingGamesByLeague(selectionLeague);
          saveCache('scheduleData', smallScheduleData);
          setGames(removeOldGames(smallScheduleData));
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

        saveCache('scheduleData', scheduleData);

        setGames(removeOldGames(scheduleData));
      } catch (error) {
        console.error('fetch games failed, using cached schedule if available', error);
        const scheduleData = getCache<FilterGames>('scheduleData');
        if (scheduleData) setGames(scheduleData);
      }
    } else {
      // if no team selected yet, try to restore cached schedule so UI can show something
      const scheduleDataRaw = getCache<FilterGames>('scheduleData');
      if (scheduleDataRaw) {
        try {
          setGames(scheduleDataRaw);
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => scrollToTopButtonRef.current?.handleScroll(event)}
        scrollEventThrottle={16}
      >
        {!teamSelected.length && <LoadingView />}
        {display()}
      </ScrollView>
      <ScrollToTopButton ref={scrollToTopButtonRef} scrollViewRef={scrollViewRef} />
    </ThemedView>
  );
}
