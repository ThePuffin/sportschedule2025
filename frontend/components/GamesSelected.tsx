import { ThemedView } from '@/components/ThemedView';
import { GameFormatted, GamesSelectedProps } from '../utils/types';
import Cards from './Cards';

export default function GamesSelected({ data = { gamesSelected: [] }, onAction }: Readonly<GamesSelectedProps>) {
  const displayGamesSelected = () => {
    return data.gamesSelected.map((gameSelected: GameFormatted) => {
      return (
        <td key={gameSelected._id}>
          <ThemedView>
            <Cards
              data={gameSelected}
              selected={false}
              showDate={true}
              showButtons={true}
              onSelection={() => onAction(gameSelected)}
            />
          </ThemedView>
        </td>
      );
    });
  };

  return (
    <table style={{ tableLayout: 'fixed', width: '100%' }}>
      <tbody>
        <tr>{displayGamesSelected()}</tr>
      </tbody>
    </table>
  );
}
