import { ThemedText } from '@/components/ThemedText';
import { ListItem } from '@rneui/themed';
import React, { useState } from 'react';
import Cards from './Cards';

import { translateWord } from '@/utils/utils';
import type { AccordionProps } from '../utils/types';

export default function Accordion({
  i = 0,
  filter = '',
  gamesFiltred = [],
  open = false,
  isCounted = false,
  showDate = false,
}: Readonly<AccordionProps>) {
  const [expanded, setExpanded] = useState(open ?? i === 0);
  const makeCards = () => {
    if (!gamesFiltred?.length) {
      return <ThemedText>There are no games today</ThemedText>
    }
    if (gamesFiltred.length) {
      return gamesFiltred.map((game) => {
        const gameId = game._id ?? Math.random();
        return (
          <Cards
            onSelection={() => {
              return;
            }}
            key={gameId}
            data={game}
            numberSelected={1}
            showDate={showDate}
            showButtons={true}
            style={{ margin: 0, padding: 0 }}
          />
        );
      });
    }
    return <ThemedText>{translateWord('noResults')}</ThemedText>
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
        onPress={() => {
          setExpanded(!expanded);
        }}
      >
        {makeCards()}
      </ListItem.Accordion>
    </div>
  );
}
