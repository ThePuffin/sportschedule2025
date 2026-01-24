export enum League {
  ALL = 'ALL',
  NHL = 'NHL',
  NFL = 'NFL',
  NBA = 'NBA',
  MLB = 'MLB',
  MLS = 'MLS',
  PWHL = 'PWHL',
  WNBA = 'WNBA',
  NCAAF = 'NCAAF',
  NCAAB = 'NCAAB',
  NCCABB = 'NCCABB',
  WNCAAB = 'WNCAAB',
}

export enum CollegeLeague {
  NCAAF = 'NCAAF',
  NCAAB = 'NCAAB',
  NCCABB = 'NCCABB',
  WNCAAB = 'WNCAAB',
}

export enum ButtonsKind {
  ADDTEAM = 'add team',
  REMOVETEAM = 'remove team',
  REMOVEGAMES = 'remove games',
}

export const emoticonEnum = {
  NHL: '🏒',
  PWHL: '⛸️',
  NFL: '🏈',
  NCAAF: '🏈',
  MLB: '⚾',
  NCCABB: '⚾',
  NBA: '🏀',
  NCAAB: '🏀',
  WNCAAB: '⛹️‍♀️',
  WNBA: '⛹️‍♀️',
  MLS: '⚽',
};

export const timeDurationEnum = {
  NHL: 3,
  PWHL: 3,
  NFL: 3.25,
  NCAAF: 3.5,
  MLB: 2.75,
  NCCABB: 2.75,
  NBA: 2.75,
  NCAAB: 2.75,
  WNCAAB: 2.75,
  WNBA: 2.75,
  MLS: 2.25,
};

export const leagueLogos = {
  MLB: require('../assets/images/MLB.png'),
  NBA: require('../assets/images/NBA.png'),
  NFL: require('../assets/images/NFL.png'),
  NHL: require('../assets/images/NHL.png'),
  WNBA: require('../assets/images/WNBA.png'),
  PWHL: require('../assets/images/PWHL.png'),
  MLS: require('../assets/images/MLS.png'),
  NCAAF: require('../assets/images/ncaa-football.png'),
  NCAAB: require('../assets/images/ncaa-basketball.png'),
  NCCABB: require('../assets/images/ncaa-baseball.png'),
  WNCAAB: require('../assets/images/ncaa-basketball-woman.png'),
  DEFAULT: require('../assets/images/DEFAULT.png'),
};

export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS', 
  FINAL = 'FINAL',
}