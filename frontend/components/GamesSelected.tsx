import { ThemedView } from '@/components/ThemedView';
import { GameFormatted, GamesSelectedProps } from '../utils/types';
import Cards from './Cards';

export default function GamesSelected({ data = [], teamNumber = 6, onAction }: Readonly<GamesSelectedProps>) {
  const displayGamesSelected = (games: GameFormatted[]) => {
    return games.map((gameSelected: GameFormatted) => {
      return (
        <td key={gameSelected._id}>
          <ThemedView>
            <Cards
              data={gameSelected}
              selected={false}
              showDate={true}
              showButtons={true}
              onSelection={() => onAction(gameSelected)}
              numberSelected={50}
            />
          </ThemedView>
        </td>
      );
    });
  };

  const cutSelectedGames: GameFormatted[][] = [];
  data.forEach((gameSelected: GameFormatted, i) => {
    const arrayNumber = Math.floor(i / teamNumber);
    console.log('arrayNumber', arrayNumber);
    if (!cutSelectedGames[arrayNumber]) {
      cutSelectedGames[arrayNumber] = new Array(teamNumber);
    }
    cutSelectedGames[arrayNumber][i % teamNumber] = gameSelected;
  });

  return (
    <table style={{ tableLayout: 'fixed', width: '100%' }}>
      <tbody>
        {cutSelectedGames.map((gamesSelected) => {
          // Use the _id of the first game in the row as the key, fallback to Math.random() if empty
          const rowKey = gamesSelected[0]?._id || Math.random().toString();
          return (
            <tr key={rowKey} style={{ width: '100%' }}>
              {displayGamesSelected(gamesSelected)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
