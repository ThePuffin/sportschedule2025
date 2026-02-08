import { ColorsTeamEnum } from "@/constants/ColorsTeam";

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

interface ThemeColors {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export interface TeamColors {
  color: string;
  backgroundColor: string;
}

interface ColorsType {
  light: ThemeColors;
  dark: ThemeColors;
  default: TeamColors;
  [key: string]: ThemeColors | TeamColors; // Index signature for dynamic team keys
}

export const Colors: ColorsType = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  default: {
    color: '#ffffff',
    backgroundColor: '#000000',
  },
  ...ColorsTeamEnum,
};
