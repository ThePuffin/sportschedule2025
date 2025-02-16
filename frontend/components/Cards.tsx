import React from 'react';

import { Card } from '@rneui/base';
import { View, Image, Text } from 'react-native';

export default function Cards({ data, showDate }) {
  const { homeTeam, awayTeam, arenaName, timeStart, homeTeamLogo, awayTeamLogo, gameDate } = data;

  const displayTitle = () => {
    if (arenaName && arenaName !== '') {
      if (showDate) {
        return (
          <Card.Title>
            <em>{gameDate}</em> {timeStart} @ {arenaName}
          </Card.Title>
        );
      }
      return (
        <Card.Title>
          {timeStart} @ {arenaName}
        </Card.Title>
      );
    }
    return <Card.Title>{gameDate}</Card.Title>;
  };

  const displayContent = () => {
    if (homeTeam && awayTeam) {
      return (
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
      );
    }
    return (
      <View
        style={{
          position: 'relative',
          alignItems: 'center',
        }}
      ></View>
    );
  };

  return (
    <div>
      <Card containerStyle={{ height: 250 }} wrapperStyle={{}}>
        <Card.Title
          style={{
            height: 42,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: showDate ? '' : 'flex',
            whiteSpace: showDate ? '' : 'nowrap',
            alignItems: showDate ? '' : 'center',
            justifyContent: showDate ? '' : 'center',
            marginBottom: showDate ? '' : 0,
          }}
        >
          {displayTitle()}
        </Card.Title>
        <Card.Divider />
        {displayContent()}
      </Card>
    </div>
  );
}
