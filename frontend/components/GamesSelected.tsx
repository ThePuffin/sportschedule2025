import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { GameFormatted, GamesSelectedProps } from '../utils/types';
import CardLarge from './CardLarge';

export default function GamesSelected({
  data = [],
  onAction,
  onRemoveFromFavorites,
  onToggleBulkSelection,
  isBulkSelected,
  teamNumber = 1,
}: Readonly<GamesSelectedProps>) {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;
  const isMediumDevice = width >= 768 && width < 1200;

  const verticalMode = useMemo(() => {
    return (teamNumber > 6 && !isSmallDevice) || isSmallDevice;
  }, [teamNumber, isSmallDevice]);

  let cardWidth = '100%';
  const maxColumns = isSmallDevice ? 2 : isMediumDevice ? 4 : 6;
  const effectiveColumns = Math.max(1, Math.min(teamNumber, maxColumns));

  if (!isSmallDevice && teamNumber === 1) {
    cardWidth = '33%';
  } else {
    cardWidth = `${100 / effectiveColumns}%`;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        width: '100%',
        justifyContent: !isSmallDevice && teamNumber === 1 ? 'center' : 'flex-start',
      }}
    >
      {data.map((gameSelected: GameFormatted) => {
        const gameStartTime = Date.parse(gameSelected.startTimeUTC);
        const isPastGame = Number.isFinite(gameStartTime) && gameStartTime < Date.now();

        return (
          <div
            key={gameSelected.uniqueId || gameSelected._id}
            style={{
              width: cardWidth,
              padding: 5,
              boxSizing: 'border-box',
              opacity: onRemoveFromFavorites && isPastGame ? 0.55 : 1,
            }}
          >
            <CardLarge
              data={gameSelected}
              showDate={true}
              showTime={true}
              onSelection={() => onAction(gameSelected)}
              onRemoveFromFavorites={
                onRemoveFromFavorites ? () => onRemoveFromFavorites(gameSelected) : undefined
              }
              onToggleBulkSelection={onToggleBulkSelection}
              isBulkSelected={isBulkSelected?.(gameSelected)}
              animateExit={true}
              animateEntry={true}
              verticalMode={verticalMode}
            />
          </div>
        );
      })}
    </div>
  );
}
