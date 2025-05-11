import { ThemedView } from '@/components/ThemedView';
import { GameFormatted } from '../utils/types';
import Cards from './Cards';

interface GamesSelectedProps {
  readonly data: { readonly gamesSelected: GameFormatted[] };
  readonly onAction: (game: GameFormatted) => void;
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
              showButtons={true}
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
