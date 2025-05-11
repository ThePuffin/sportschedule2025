import { Team } from './types';

export const randomNumber = (max) => {
  return Math.floor(Math.random() * (max - 0 + 1) + 0);
};

export const addNewTeamId = (selection: string[], teams: Team[]) => {
  const randomId = teams[randomNumber(teams.length) - 1]?.uniqueId;
  if (randomId && !selection.includes(randomId)) {
    selection.push(randomId);
  }
  return selection;
};

export const removeLastTeamId = (selection: string[]) => {
  selection.pop();
  return selection;
};

interface ICSFileParams {
  homeTeam: string;
  awayTeam: string;
  startTimeUTC: string;
  arenaName: string;
  placeName: string;
}

const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICSFile = ({ homeTeam, awayTeam, startTimeUTC, arenaName, placeName }: ICSFileParams) => {
  const startDate = new Date(startTimeUTC);

  if (isNaN(startDate.getTime())) {
    console.error('Invalid startTimeUTC provided:', startTimeUTC);

    return;
  }

  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  const now = new Date();

  const eventUID = `${formatICSDate(startDate)}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `UID:${eventUID}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${homeTeam} vs ${awayTeam}`,
    `LOCATION:${arenaName}, ${placeName}`,
    `DESCRIPTION:Game between ${homeTeam} and ${awayTeam} at ${arenaName}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  try {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize filename slightly
    const filename = `${homeTeam}_vs_${awayTeam}.ics`.replace(/[^a-z0-9_.-]/gi, '_');
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (e) {
    console.error('Error generating or downloading ICS file:', e);
    return;
  }
};

export const translateWord = (word) => {
  let translation = {};
  const language = navigator.language.split('-')[0];
  switch (language) {
    case 'de':
      translation = {
        translatedLeague: 'ALLE',
        gamesOfDay: 'Spiele des Tages',
        remainingGames: 'Verbleibende Spiele',
        calendars: 'Kalender',
      };
      break;
    case 'es':
      translation = {
        translatedLeague: 'TODOS',
        gamesOfDay: 'Juegos del día',
        remainingGames: 'Juegos restantes',
        calendars: 'Calendarios',
      };
      break;
    case 'fr':
      translation = {
        translatedLeague: 'TOUS',
        gamesOfDay: 'Programme du jour',
        remainingGames: 'Matchs restants',
        calendars: 'Calendriers',
      };
      break;
    case 'it':
      translation = {
        translatedLeague: 'TUTTI',
        gamesOfDay: 'Giochi del giorno',
        remainingGames: 'Giochi rimanenti',
        calendars: 'Calendari',
      };
      break;
    case 'ja':
      translation = {
        translatedLeague: 'すべて',
        gamesOfDay: 'その日のゲーム',
        remainingGames: '残りのゲーム',
        calendars: 'カレンダー',
      };
      break;
    case 'ko':
      translation = {
        translatedLeague: '전체',
        gamesOfDay: '그날의 게임',
        remainingGames: '남은 게임',
        calendars: '달력',
      };
      break;
    case 'nl':
      translation = {
        translatedLeague: 'ALLE',
        gamesOfDay: 'Spelkalender',
        remainingGames: 'Resterende spellen',
        calendars: 'Kalenders',
      };
      break;
    case 'pt':
      translation = {
        translatedLeague: 'TODOS',
        gamesOfDay: 'Jogos do dia',
        remainingGames: 'Jogos restantes',
        calendars: 'Calendários',
      };
      break;
    case 'ru':
      translation = {
        translatedLeague: 'ВСЕ',
        gamesOfDay: 'Игры дня',
        remainingGames: 'Оставшиеся игры',
        calendars: 'Календари',
      };
      break;
    case 'zh':
      translation = {
        translatedLeague: '所有',
        gamesOfDay: '当天的比赛',
        remainingGames: '剩余比赛',
        calendars: '日历',
      };
      break;
    default:
      translation = {
        translatedLeague: 'ALL',
        gamesOfDay: 'Games of the day',
        remainingGames: 'Remaining games',
        calendars: 'Calendars',
      };
      break;
  }
  return translation[word] ?? '';
};
