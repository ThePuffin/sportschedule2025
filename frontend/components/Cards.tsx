import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { CardsProps } from '../utils/types';
import { generateICSFile } from '../utils/utils';

export default function Cards({
  data,
  showDate = false,
  showButtons = false,
  onSelection = () => {},
  numberSelected = 0,
  selected = false,
}: Readonly<CardsProps>) {
  const {
    homeTeam,
    awayTeam,
    arenaName = '',
    homeTeamLogo,
    awayTeamLogo,
    teamSelectedId = '',
    startTimeUTC,
    placeName = '',
    color,
    backgroundColor,
    awayTeamShort,
    homeTeamShort,
  } = data;
  const show = typeof data.show === 'boolean' ? data.show : data.show === 'true';

  const [teamNameHome, setTeamNameHome] = useState(homeTeam);
  const [teamNameAway, setTeamNameAway] = useState(awayTeam);
  const [isSmallDevice, setIsSmallDevice] = useState(false);
  const [fontSize, setFontSize] = useState('1rem');

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');
      setTeamNameHome(homeTeam);
      setTeamNameAway(awayTeam);
      if (width <= 1075) {
        if (numberSelected > 2) {
          setTeamNameHome(homeTeamShort);
          setTeamNameAway(awayTeamShort);
        }
        setIsSmallDevice(true);
        setFontSize('0.75rem');
      } else {
        setIsSmallDevice(false);
        setFontSize('0.9rem');
      }
    };

    updateDeviceType();
    Dimensions.addEventListener('change', updateDeviceType);

    return () => {
      Dimensions.removeEventListener('change', updateDeviceType);
    };
  }, []);

  const date = data?.gameDate ? new Date(data.gameDate) : new Date();
  let gameDate = new Date(date).toLocaleDateString(undefined, {
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
  const defaultColors = Colors.default;
  const colors = Colors[teamSelectedId] ?? {};
  const teamColors =
    colors.backgroundColor && colors.backgroundColor !== ''
      ? colors
      : color && backgroundColor
      ? { color, backgroundColor }
      : defaultColors;
  


  let cardClass = show
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
    ? {
        filter: 'brightness(1.25) saturate(1.5) contrast(1.05)',
        border: 'double' + teamColors?.color ,
      }
    : {};

  const displayTitle = () => {
    if (arenaName && arenaName !== '') {
      return (
        <Card.Title style={{ ...cardClass }}>
          <button
            onClick={() => {
              if (showButtons) generateICSFile(data);
            }}
            style={{
              cursor: 'pointer',
              textDecoration: showButtons && !isSmallDevice ? 'underline' : 'none',
              color: showButtons && isSmallDevice ? teamColors.color : 'inherit',
              backgroundColor: showButtons && isSmallDevice ? teamColors.backgroundColor : 'inherit',
              border: 'none',
              font: 'inherit',
              padding: 0,
              margin: 0,
            }}
            aria-label="Generate ICS file"
          >
            {showButtons && (
              <Icon
                name="calendar"
                type="font-awesome"
                style={{ paddingRight: isSmallDevice ? 5 : 10 }}
                size={isSmallDevice ? 10 : 15}
                color={teamColors.backgroundColor}
              />
            )}
            {gameDate}
          </button>
        </Card.Title>
      );
    }
    return <Card.Title style={{ fontSize }}>{gameDate}</Card.Title>;
  };

  const displayContent = () => {
    if (homeTeam && awayTeam) {
      const stadiumSearch = arenaName.replace(/\s+/g, '+') + ',' + placeName.replace(/\s+/g, '+');
      let shortArenaName = arenaName;
      if (numberSelected > 1) {
        shortArenaName =
          arenaName && numberSelected > 3 && arenaName.length > 5 ? arenaName.split(' ')[0] + ' ...' : arenaName || '';
        shortArenaName = isSmallDevice ? shortArenaName.split(' ').slice(0, -1).join(' ') : shortArenaName;
        shortArenaName =
          isSmallDevice && shortArenaName.length > 7 && numberSelected > 5
            ? shortArenaName.slice(0, 6) + ' ...'
            : shortArenaName;
      }
      return (
        <View
          onClick={() => {
            if (show) {
              if (!showDate) {
                generateICSFile(data);
              } else {
                onSelection(data);
              }
            }
          }}
          style={{
            cursor: show ? 'pointer' : 'not-allowed',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            height: 180,
          }}
        >
          <Image
            style={{
              width: '50%',
              height: 50,
              filter:
                'drop-shadow(-1px 0 0 #101518) drop-shadow(0 -1px 0 #101518) drop-shadow(-0.1px 0 0 #101518) drop-shadow(0 0.1px 0 #101518)',
            }}
            resizeMode="contain"
            source={{
              uri: awayTeamLogo,
            }}
          />
          <Text style={{ ...cardClass, backgroundColor: 'transparent' }}>{teamNameAway}</Text>
          <Text style={{ ...cardClass, backgroundColor: 'transparent' }}>@</Text>
          <Text style={{ ...cardClass, backgroundColor: 'transparent' }}>{teamNameHome}</Text>
          <Image
            style={{
              width: '50%',
              height: 50,
              filter:
                'drop-shadow(-1.5px 0 0 #101518) drop-shadow(0 -1px 0 #101518) drop-shadow(-0.1px 0 0 #101518) drop-shadow(0 0.1px 0 #101518)',
            }}
            resizeMode="contain"
            source={{
              uri: homeTeamLogo,
            }}
          />
          <br />
          <Text>
            {showButtons || !showDate ? (
              <a
                href={`https://maps.google.com/?q=${stadiumSearch}`}
                style={{
                  textDecoration: 'none',
                  color: cardClass.color ,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon
                  name="map-marker"
                  type="font-awesome"
                  size={isSmallDevice ? 10 : 12}
                  style={{ marginRight: 0 }}
                  color={cardClass.color }
                />
                <span
                  style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {arenaName ? shortArenaName : 'Stadium not found'}
                </span>
              </a>
            ) : (
              <div
                style={{
                  display: 'flex', // Makes the content inline
                  alignItems: 'center', // Vertically aligns items
                  gap: 5, // Adds spacing between the icon and text
                }}
              >
                <Icon
                  name="map-marker"
                  type="font-awesome"
                  size={isSmallDevice ? 10 : 12}
                  style={{ marginRight: 0 }}
                  color={cardClass.color }
                />
                <p
                  style={{
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    width: '80%',
                    margin: 3,
                    padding: 0,
                    color: cardClass.color ,
                  }}
                >
                  {arenaName ? shortArenaName : 'Stadium not found'}
                </p>
              </div>
            )}
          </Text>
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
        onClick={() => {
          if (show && !showButtons) {
            onSelection(data);
          }
        }}
        containerStyle={{
          marginLeft: 0,
          marginRight: 0,
          ...selectedCard,
          ...cardClass,
          height: 270,
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
          }}
        >
          {displayTitle()}
        </Card.Title>
        <Card.Divider style={{ backgroundColor: teamColors.color }} />
        {displayContent()}
      </Card>
    </div>
  );
}
