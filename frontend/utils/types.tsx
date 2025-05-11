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
  placeName: string;
  gameDate: string;
  teamSelectedId: string;
  startTimeUTC: string;
  show: boolean;
  selectedTeam: boolean;
  league: string;
  updateDate?: Date;
  venueTimezone?: string;
  isActive?: boolean;
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
