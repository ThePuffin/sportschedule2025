import React from 'react';

import { Card } from '@rneui/base';
import { View, Image, Text } from 'react-native';

export default function Cards({ data }) {
  const { homeTeam, awayTeam, arenaName, timeStart } = data;
  console.log(homeTeam, awayTeam, 'ici');
  return (
    <div>
      <Card containerStyle={{}} wrapperStyle={{}}>
        <Card.Title>
          {timeStart} @ {arenaName}
        </Card.Title>
        <Card.Divider />
        <View
          style={{
            position: 'relative',
            alignItems: 'center',
          }}
        >
          <Text>{homeTeam}</Text>
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: 'https://avatars0.githubusercontent.com/u/32242596?s=460&u=1ea285743fc4b083f95d6ee0be2e7bb8dcfc676e&v=4',
            }}
          />
          <Text>vs</Text>
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: 'https://avatars0.githubusercontent.com/u/32242596?s=460&u=1ea285743fc4b083f95d6ee0be2e7bb8dcfc676e&v=4',
            }}
          />
          <Text>{awayTeam}</Text>
        </View>
      </Card>
    </div>
  );
}
