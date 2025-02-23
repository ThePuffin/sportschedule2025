import React, { useState } from 'react';
import { ListItem } from '@rneui/themed';
import Cards from './Cards';
import { ThemedText } from '@/components/ThemedText';

export default function Accordion({ i, league, gamesFiltred }) {
  const [expanded, setExpanded] = useState(i === 0);
  const makeCards = (league) => {
    if (!gamesFiltred || !gamesFiltred.length) {
      return <ThemedText>There are no games today</ThemedText>;
    }
    if (gamesFiltred.length) {
      return gamesFiltred.map((game) => {
        const gameId = game?._id || Math.random();
        return <Cards onSelection={() => console.log('click')} key={gameId} data={game} />;
      });
    }
    return <ThemedText>Wait for it ....</ThemedText>;
  };

  return (
    <div>
      <ListItem.Accordion
        content={
          <>
            <ListItem.Content>
              <ListItem.Title>{league}</ListItem.Title>
            </ListItem.Content>
          </>
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
