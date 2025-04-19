import { Card } from '@rneui/base';
import { View, Image, Text, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors.ts';
import { GameFormatted } from '../utils/types.ts';
import React, { useEffect, useState } from 'react';
import { Icon } from '@rneui/themed';

interface CardsProps {
  data: GameFormatted;
  showDate: boolean;
  showName: boolean;
  onSelection: (game: GameFormatted) => void;
  selected: boolean;
}

export default function Cards({
  data,
  showDate,
  showName = true,
  onSelection = {},
  selected = true,
}: Readonly<CardsProps>) {
  const {
    homeTeam,
    awayTeam,
    arenaName,
    homeTeamLogo,
    awayTeamLogo,
    teamSelectedId,
    show,
    startTimeUTC,
    color,
    backgroundColor,
    awayTeamShort,
    homeTeamShort,
  } = data;

  const [teamNameHome, setTeamNameHome] = useState(homeTeam);
  const [teamNameAway, setTeamNameAway] = useState(awayTeam);
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [fontSize, setFontSize] = useState('1rem');

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');

      if (width <= 1075) {
        setTeamNameHome(homeTeamShort);
        setTeamNameAway(awayTeamShort);
        setIsSmallDevice(true);
        setFontSize('0.75rem');
      } else {
        setTeamNameHome(homeTeam);
        setTeamNameAway(awayTeam);
        setIsSmallDevice(false);
        setFontSize('1rem');
      }
    };

    updateDeviceType();
    Dimensions.addEventListener('change', updateDeviceType);

    return () => {
      Dimensions.removeEventListener('change', updateDeviceType);
    };
  }, []);

  let gameDate = new Date(data.gameDate).toLocaleDateString(undefined, {
    day: '2-digit',
    month: isSmallDevice ? '2-digit' : 'short',
  });
  if (startTimeUTC) {
    gameDate = showDate
      ? new Date(startTimeUTC).toLocaleString(undefined, {
          day: '2-digit',
          month: isSmallDevice ? '2-digit' : 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date(startTimeUTC).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const colors = Colors[teamSelectedId];
  const teamColors =
    colors.backgroundColor && colors.backgroundColor !== '' ? Colors[teamSelectedId] : { color, backgroundColor };

  const defaultColors = Colors.default;

  let cardClass =
    show === 'true'
      ? {
          ...teamColors,
          fontSize,
        }
      : {
          fontSize,
          opacity: '0.97',

          backgroundColor: '#ffffee',
        };

  let selectedCard = selected
    ? { filter: 'brightness(1.25) saturate(1.5)', border: 'double' + teamColors?.color || defaultColors.color }
    : {};

  const displayTitle = () => {
    if (arenaName && arenaName !== '') {
      const stadiumSearch = arenaName.replace(/\s+/g, '+');
      return (
        <Card.Title style={{ ...cardClass }}>
          <em>{gameDate} </em>
          <a
            href={`https://maps.google.com/?q=${stadiumSearch}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon
              name="map-marker"
              type="font-awesome"
              size={isSmallDevice ? 12 : 16}
              color={cardClass.color ?? defaultColors.color}
              style={{ marginRight: 3 }}
            />
            {arenaName}
          </a>
        </Card.Title>
      );
    }
    return <Card.Title style={{ fontSize }}>{gameDate}</Card.Title>;
  };

  const displayContent = () => {
    if (homeTeam && awayTeam) {
      return (
        <View
          onClick={() => {
            if (show === 'true') {
              onSelection(data);
            }
          }}
          style={{
            cursor: show === 'true' ? 'pointer' : 'not-allowed',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: isSmallDevice ? 193 : 157,
          }}
        >
          <Image
            style={{ width: '50%', height: 50 }}
            resizeMode="contain"
            source={{
              uri: awayTeamLogo,
            }}
          />
          <Text style={cardClass}>{teamNameAway}</Text>
          <Text style={cardClass}>@</Text>
          <Text style={cardClass}>{teamNameHome}</Text>
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
      <Card
        containerStyle={{
          marginLeft: 0,
          marginRight: 0,
          ...selectedCard,
          ...cardClass,
          height: isSmallDevice ? 300 : 250,
        }}
        wrapperStyle={cardClass}
      >
        <Card.Title
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: showDate ? '' : 'flex',
            whiteSpace: showDate ? '' : 'nowrap',
            alignItems: showDate ? '' : 'center',
            justifyContent: showDate ? '' : 'center',
            marginBottom: showDate ? '' : 0,
            height: isSmallDevice ? 55 : 42,
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
