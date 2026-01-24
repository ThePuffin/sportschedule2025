import NoResults from '@/components/NoResults';
import { ListItem } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import CardLarge from './CardLarge';

import type { AccordionProps } from '../utils/types';

export default function Accordion({
  i = 0,
  filter = '',
  gamesFiltred = [],
  open = false,
  isCounted = false,
  showDate = false,
  disableToggle = false,
  gamesSelected = [],
  onRetry,
}: Readonly<AccordionProps & { onRetry?: () => void }>) {
  const [expanded, setExpanded] = useState(disableToggle ? true : (open ?? i === 0));

  // Synchronize internal expanded state with the 'open' prop
  useEffect(() => {
    setExpanded(disableToggle ? true : (open ?? i === 0));
  }, [open, disableToggle, i]);

  const makeCards = () => {
    if (!gamesFiltred?.length) {
      return <NoResults onRetry={onRetry} />;
    }
    if (gamesFiltred.length) {
      return gamesFiltred.map((game) => {
        const isSelected = gamesSelected.some(
          (gameSelect) => game.homeTeamId === gameSelect.homeTeamId && game.startTimeUTC === gameSelect.startTimeUTC,
        );
          return (
          <CardLarge
            onSelection={() => {
              return;
            }}
            key={`${game.homeTeamId}-${game.startTimeUTC}`}
            data={game}
            numberSelected={1}
            showDate={showDate}
            showButtons={true}
            selected={isSelected}
            disableSelection={true}
          />
        );
      });
    }
    return <NoResults onRetry={onRetry} />;
  };

  return (
    <div>
      <ListItem.Accordion
        content={
          <ListItem.Content>
            <ListItem.Title>
              {filter} {isCounted ? `(${gamesFiltred?.length})` : ''}
            </ListItem.Title>
          </ListItem.Content>
        }
        isExpanded={expanded}
        noIcon={disableToggle}
        onPress={disableToggle ? undefined : () => setExpanded(!expanded)}
      >
        {makeCards()}
      </ListItem.Accordion>
    </div>
  );
}
