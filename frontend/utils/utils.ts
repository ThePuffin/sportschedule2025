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

export const generateICSFile = ({ homeTeam, awayTeam, startTimeUTC, arenaName, placeName }) => {
  const icsContent = `
      UID: ${Date.now()}
      BEGIN:VCALENDAR
      VERSION:2.0
      BEGIN:VEVENT
      SUMMARY:${homeTeam} vs ${awayTeam}
      DTSTART:${new Date(startTimeUTC).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
      DTEND:${
        new Date(new Date(startTimeUTC).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]
      }Z
      LOCATION:${arenaName}, ${placeName}
      DESCRIPTION:Game between ${homeTeam} and ${awayTeam} at ${arenaName}.
      END:VEVENT
      END:VCALENDAR
              `;
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${homeTeam}_vs_${awayTeam}.ics`;
  link.click();
  URL.revokeObjectURL(url);
};

export const translateLeagueAll = () => {
  let translatedLeague = '';
  const language = navigator.language.split('-')[0];
  switch (language) {
    case 'fr':
      translatedLeague = 'TOUS';
      break;
    case 'en':
      translatedLeague = 'ALL';
      break;
    case 'de':
      translatedLeague = 'ALLE';
      break;
    case 'es':
      translatedLeague = 'TODOS';
      break;
    case 'it':
      translatedLeague = 'TUTTI';
      break;
    case 'zh':
      translatedLeague = '所有';
      break;
    case 'ja':
      translatedLeague = 'すべて';
      break;
    case 'ko':
      translatedLeague = '전체';
      break;
    default:
      break;
  }
  return translatedLeague;
};
