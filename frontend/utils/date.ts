import { GameStatus, timeDurationEnum } from '@/constants/enum';
import { GameFormatted } from '@/utils/types';

export const readableDate = (date: string | Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getHourGame = (startTimeUTC: string | Date, venueUTCOffset: string) => {
  const timeToRemove = Number(venueUTCOffset.replace(':', '.').replace('-', ''));
  const starTime = new Date(startTimeUTC);
  const getCorrectDate = starTime.setHours(starTime.getHours() - timeToRemove);
  const hourStart = new Date(getCorrectDate).getUTCHours().toString().padStart(2, '0');
  const minStart = new Date(getCorrectDate).getMinutes().toString().padStart(2, '0');
  return `${hourStart}:${minStart}`;
};

export const addDays = (date: string | Date, nbDay: number) => {
  const day = new Date(date);
  day.setDate(day.getDate() + nbDay);
  return day.toString();
};

export const getGamesStatus = (game: GameFormatted) => {
  const now = new Date();
  const startTime = new Date(game.startTimeUTC);
  const duration = timeDurationEnum[game.league as keyof typeof timeDurationEnum] ?? 2.5;
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + duration);
  if (now >= startTime && typeof game.homeTeamScore === 'number' && typeof game.awayTeamScore === 'number') {
    return GameStatus.FINISHED;
  } else if (now > endTime) {
    return GameStatus.FINAL;
  } else if (now >= startTime && now <= endTime) {
    return GameStatus.IN_PROGRESS;
  }
  return GameStatus.SCHEDULED;
};
