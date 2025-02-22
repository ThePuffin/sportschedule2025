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

export const removeLastTeamId = (selection) => {
  selection.pop();
  return selection;
};
