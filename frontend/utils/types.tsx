import { ButtonProps } from '@rneui/themed';

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

export interface League {
  label: string;
  value: string;
  uniqueId: string;
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

export type AccordionProps = {
  readonly i?: number;
  readonly filter?: string;
  readonly gamesFiltred?: ReadonlyArray<GameFormatted>;
  readonly open?: boolean;
  readonly isCounted?: boolean;
  readonly showDate?: boolean;
};

export interface ButtonsProps {
  data: { selectedTeamsNumber: number; selectedGamesNumber: number; loadingTeams: boolean };
  onClicks: (clickedButton: string) => void;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
  dateRange: DateRange;
  noEnd: boolean;
}

export interface IconButtonProps extends ButtonProps {
  iconName: string;
  iconColor?: string;
  buttonColor?: string;
  borderColor?: string;
}

export interface GamesSelectedProps {
  readonly data?: GameFormatted[];
  readonly onAction: (game: GameFormatted) => void;
}
export interface SelectorProps {
  data: {
    itemsSelectedIds: string[];
    items: Team[];
    i: number;
    itemSelectedId: string;
  };
  onItemSelectionChange: (itemmSelectedId: string, i: number) => void;
}

export interface CardsProps {
  data: GameFormatted;
  showDate: boolean;
  onSelection?: (game: GameFormatted) => void;
  selected: boolean;
  showButtons?: boolean;
  numberSelected?: number;
}
