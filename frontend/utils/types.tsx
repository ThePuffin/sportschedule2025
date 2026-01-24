import { ButtonProps } from '@rneui/themed';

export interface GameFormatted {
  _id?: string;
  uniqueId: string;
  awayTeamId: string;
  awayTeam: string;
  awayTeamShort: string;
  awayTeamLogo: string;
  awayTeamLogoDark?: string;
  awayTeamScore: number | null;
  awayTeamRecord?: string;
  homeTeamId: string;
  homeTeam: string;
  homeTeamShort: string;
  homeTeamScore: number | null;
  homeTeamLogo: string;
  homeTeamLogoDark?: string;
  homeTeamRecord?: string;
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
  awayTeamColor: string;
  awayTeamBackgroundColor: string;
  homeTeamColor: string;
  homeTeamBackgroundColor: string;
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
  record?: string;
  color?: string;
  backgroundColor?: string;
  awayTeamColor?: string;
  awayTeamBackgroundColor?: string;
  homeTeamColor?: string;
  homeTeamBackgroundColor?: string;
}

export interface FilterGames {
  [date: string]: GameFormatted[];
}

export type AccordionProps = {
  readonly i?: number;
  readonly filter?: string;
  readonly gamesFiltred: readonly GameFormatted[];
  readonly open?: boolean;
  readonly isCounted?: boolean;
  readonly disableToggle?: boolean;
  readonly showDate?: boolean;
  readonly gamesSelected?: readonly GameFormatted[];
};

export interface ButtonsProps {
  data: { selectedTeamsNumber: number; selectedGamesNumber: number; loadingTeams: boolean; maxTeamsNumber?: number };
  onClicks: (clickedButton: string) => void;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
  dateRange?: DateRange;
  selectDate?: Date;
  readonly?: boolean;
}

export interface IconButtonProps extends ButtonProps {
  iconName: string;
  iconColor?: string;
  buttonColor?: string;
  borderColor?: string;
}

export interface GamesSelectedProps {
  readonly data?: GameFormatted[];
  readonly teamNumber?: number;
  readonly onAction: (game: GameFormatted) => void;
}

export interface SelectorProps {
  data: {
    itemsSelectedIds: string[];
    items: Team[] | string[];
    i: number;
    itemSelectedId: string;
  };
  onItemSelectionChange: (itemSelectedId: string | string[], i: number) => void;
  allowMultipleSelection?: boolean;
  isClearable?: boolean;
}

export interface CardsProps {
  data: GameFormatted;
  showDate: boolean;
  onSelection?: (game: GameFormatted) => void;
  selected: boolean;
  showButtons?: boolean;
  numberSelected?: number;
}
