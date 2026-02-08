import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { GameFormatted, GamesSelectedProps } from '../utils/types';
import CardLarge from './CardLarge';

export default function GamesSelected({ data = [], onAction, teamNumber = 1 }: Readonly<GamesSelectedProps>) {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 768;

  const verticalMode = useMemo(() => {
    return (teamNumber > 6 && !isSmallDevice) || isSmallDevice;
  }, [teamNumber, isSmallDevice]);

  let cardWidth = '100%';
  if (!isSmallDevice) {
    cardWidth = teamNumber === 1 ? '33%' : `${100 / teamNumber}%`;
  } else {
    cardWidth = '50%';
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
        return (
          <div
            key={gameSelected.uniqueId || gameSelected._id}
            style={{ width: cardWidth, padding: 5, boxSizing: 'border-box' }}
          >
            <CardLarge
              data={gameSelected}
              showDate={true}
              showTime={true}
              onSelection={() => onAction(gameSelected)}
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
