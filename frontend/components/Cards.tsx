import React from 'react';

import { Card } from '@rneui/base';
import { View, Image, Text } from 'react-native';
import { Colors } from '../constants/Colors.ts';
import { GameFormatted } from '../utils/types.ts';

interface CardsProps {
  data: GameFormatted;
  showDate: boolean;
  showName: boolean;
  onSelection: (game: GameFormatted) => void;
}

export default function Cards({ data, showDate, showName = true, onSelection = {} }: Readonly<CardsProps>) {
  const { homeTeam, awayTeam, arenaName, timeStart, homeTeamLogo, awayTeamLogo, gameDate, teamSelectedId, show } = data;

  let cardClass =
    show === 'true'
      ? {
          cursor: 'pointer',
          ...Colors[teamSelectedId],
        }
      : {
          cursor: 'no-drop',
          opacity: '0.97',
          pointerEvents: 'none',
          backgroundColor: '#ffffee',
        };

  const displayTitle = () => {
    if (arenaName && arenaName !== '') {
      return (
        <Card.Title style={cardClass}>
          {showDate && <em>{gameDate} </em>}
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
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: awayTeamLogo,
            }}
          />
          {showName ? <Text style={cardClass}>{awayTeam}</Text> : null}
          <Text style={cardClass}>@</Text>
          {showName ? <Text style={cardClass}>{homeTeam}</Text> : null}
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: homeTeamLogo,
            }}
          />
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
    <div className={cardClass}>
      <Card onClick={() => onSelection(data)} containerStyle={{ height: 250, ...cardClass }} wrapperStyle={cardClass}>
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
