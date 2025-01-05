import type { GameFormatted } from '../../utils/interface/game';
import type { NHLGameAPI } from '../../utils/interface/gameNHL';
import type { TeamNHL, TeamType } from '../../utils/interface/team';
import { getHourGame } from '../../utils/date';
import { League } from '../../utils/enum';
const leagueName = League.NHL;
const { NODE_ENV } = process.env;

export class HockeyData {
  async getNhlTeams(): Promise<TeamType[]> {
    try {
      let allTeams: TeamNHL[];

      const fetchedTeams = await fetch(
        'https://api-web.nhle.com/v1/standings/now',
      );
      const fetchTeams = await fetchedTeams.json();
      allTeams = await fetchTeams.standings;

      allTeams = allTeams.map((team: TeamNHL) => {
        if (team.teamAbbrev.default === 'ARI') {
          team.teamAbbrev.default = 'UTA';
          team.teamCommonName.default = 'Utah';
        }
        return team;
      });

      const activeTeams = allTeams
        .toSorted((a: TeamNHL, b: TeamNHL) =>
          a.placeName?.default > b.placeName?.default ? 1 : -1,
        )
        .map((team: TeamNHL) => {
          const {
            teamAbbrev,
            teamName,
            teamLogo,
            divisionName,
            teamCommonName,
            conferenceName,
          } = team;
          const teamID = teamAbbrev.default;
          const uniqueId = `${leagueName}-${teamID}`;

          return {
            uniqueId,
            value: uniqueId,
            id: teamID,
            abbrev: teamID,
            label: teamName?.default,
            teamLogo: teamLogo,
            teamCommonName: teamCommonName.default,
            conferenceName,
            divisionName,
            league: leagueName,
            updateDate: new Date().toDateString(),
          };
        });

      return activeTeams;
    } catch (error) {
      console.error('Error fetching data =>', error);
      return [];
    }
  }

  getNhlSchedule = async (activeTeams) => {
    const allGames = {};

    await Promise.all(
      activeTeams.map(async ({ id, value }) => {
        const leagueID = `${leagueName}-${id}`;
        allGames[leagueID] = await this.getNhlTeamSchedule(id, value);
      }),
    );

    for (const team of Object.keys(allGames)) {
      if (allGames[team].length === 0) {
        delete allGames[team];
      }
    }

    console.log('updated NHL');
    return allGames;
  };

  getNhlTeamSchedule = async (id: string, value: string) => {
    try {
      let games: NHLGameAPI[];
      try {
        const fetchedGames = await fetch(
          `https://api-web.nhle.com/v1/club-schedule-season/${id}/now`,
        );
        const fetchGames = await fetchedGames.json();
        games = await fetchGames.games;
        console.log('yes', value);
      } catch (error) {
        console.log('no', value);

        games = [];
      }
      const now = new Date();
      let gamesData: GameFormatted[] = games.map((game: NHLGameAPI) => {
        const {
          awayTeam,
          homeTeam,
          venue,
          gameDate,
          venueTimezone,
          startTimeUTC,
          venueUTCOffset,
        } = game;

        const timeStart = getHourGame(startTimeUTC, venueUTCOffset);

        if (new Date(gameDate) < now) return;
        return {
          uniqueId: `${value}-${gameDate}-1`,
          awayTeamId: awayTeam.abbrev,
          awayTeam: awayTeam.placeName.default,
          homeTeam: homeTeam.placeName.default,
          awayTeamShort: awayTeam.abbrev,
          homeTeamId: homeTeam.abbrev,
          homeTeamShort: homeTeam.abbrev,
          arenaName: venue?.default || '',
          gameDate: gameDate,
          teamSelectedId: value,
          show: homeTeam.abbrev === id,
          selectedTeam: homeTeam.abbrev === id,
          league: leagueName,
          venueTimezone: venueTimezone,
          timeStart,
        };
      });

      gamesData = gamesData.filter(
        (game) => game !== undefined && game !== null,
      );

      return gamesData;
    } catch (error) {
      console.error('Error fetching data', error);
      return {};
    }
  };
}
