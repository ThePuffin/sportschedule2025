import React, { useState } from 'react';
import { ListItem } from '@rneui/themed';
import Cards from './Cards';
import { ThemedText } from '@/components/ThemedText';

export default function Accordion({ i, league, gamesFiltred = [], open }) {
  const [expanded, setExpanded] = useState(open ?? i === 0);
  const makeCards = (league) => {
    if (!gamesFiltred?.length) {
      return <ThemedText>There are no games today</ThemedText>;
    }
    if (gamesFiltred.length) {
      return gamesFiltred.map((game) => {
        const gameId = game?._id || Math.random();
        return (
          <Cards
            onSelection={() => {
              return;
            }}
            key={gameId}
            data={game}
            style={{ margin: 0, padding: 0 }}
          />
        );
      });
    }
    return <ThemedText>Wait for it ....</ThemedText>;
  };

  return (
    <div>
      <ListItem.Accordion
        content={
          <ListItem.Content>
            <ListItem.Title>
              {league} ({gamesFiltred?.length})
            </ListItem.Title>
          </ListItem.Content>
        }
        isExpanded={expanded}
        onPress={() => {
          setExpanded(!expanded);
        }}
      >
        {makeCards(league)}
      </ListItem.Accordion>
    </div>
  );
}
