export const maxFavoritesNumber = 9;

export const maxTeamsNumber = 9;

/**
 * Minimum number of games (past or upcoming) a team must have to be offered as
 * a **selection** — global favorite, Calendar team, or Schedule team filter.
 *
 * Backed by `GET /teams?minGames=`, which counts each team's active games.
 * Raising it hides more of the long tail of teams that only ever appear as an
 * opponent (or not at all); lowering it widens every selector again.
 *
 * Opponents are deliberately NOT restricted by this: a game always displays
 * both of its teams, whoever they are.
 */
export const selectableMinGames = 4;
