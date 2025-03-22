import { ThemedView } from '@/components/ThemedView';
import Cards from './Cards';
import { GameFormatted } from '../utils/types.ts';

interface GamesSelectedProps {
  data: { gamesSelected: GameFormatted[] };
  onAction: (game: GameFormatted) => void;
}

export default function GamesSelected({ data = { gamesSelected }, onAction }: GamesSelectedProps) {
  const displayGamesSelected = () => {
    return data.map((gameSelected, i) => {
      return (
        <td key={gameSelected.gameId}>
          <ThemedView>
            <Cards
              data={gameSelected}
              selected={false}
              showDate={true}
              showName={false}
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
