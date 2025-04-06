export interface GameFormatted {
  _id?: string;
  uniqueId: string;
  awayTeamId: string;
  awayTeam: string;
  awayTeamShort: string;
  awayTeamLogo: string;
  homeTeamId: string;
  homeTeam: string;
  homeTeamShort: string;
  homeTeamLogo: string;
  arenaName: string;
  gameDate: string;
  teamSelectedId: string;
  show: boolean;
  selectedTeam: boolean;
  league: string;
  updateDate?: Date;
  venueTimezone?: string;
  timeStart?: string;
  color: string;
  backgroundColor: string;
}

export interface Team {
  uniqueId: string;
  value: string;
  id: string;
  label: string;
  teamLogo: string;
  teamCommonName: string;
  conferenceName: string;
  divisionName: string;
  league: string;
  abbrev: string;
  updateDate: string;
}

export interface FilterGames {
  [date: string]: GameFormatted[];
}
