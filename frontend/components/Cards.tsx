import React from 'react';

import { Card } from '@rneui/base';
import { View, Image, Text } from 'react-native';

export default function Cards({ data }) {
  const { homeTeam, awayTeam, arenaName, timeStart, homeTeamLogo, awayTeamLogo } = data;
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
              uri: homeTeamLogo,
            }}
          />
          <Text>vs</Text>
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: awayTeamLogo,
            }}
          />
          <Text>{awayTeam}</Text>
        </View>
      </Card>
    </div>
  );
}
