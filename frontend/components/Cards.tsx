import { League, timeDurationEnum } from '@/constants/enum';
import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ImageSourcePropType, Text, View } from 'react-native';
import { Colors, TeamColors } from '../constants/Colors';
import { getCache } from '../utils/fetchData';
import { CardsProps } from '../utils/types';
import { generateICSFile, translateWord } from '../utils/utils';
const defaultLogo = require('../assets/images/default_logo.png');

interface LeagueLogosType {
  [key: string]: ImageSourcePropType;
}

const leagueLogos: LeagueLogosType = {
  MLB: require('../assets/images/MLB.png'),
  NBA: require('../assets/images/NBA.png'),
  NFL: require('../assets/images/NFL.png'),
  NHL: require('../assets/images/NHL.png'),
  WNBA: require('../assets/images/WNBA.png'),
  PWHL: require('../assets/images/PWHL.png'),
  MLS: require('../assets/images/MLS.png'),
  NCAAF: require('../assets/images/ncaa-football.png'),
  NCAAB: require('../assets/images/ncaa-basketball.png'),
  NCCABB: require('../assets/images/ncaa-baseball.png'),
  WNCAAB: require('../assets/images/ncaa-basketball-woman.png'),
  DEFAULT: require('../assets/images/DEFAULT.png'),
};

export default function Cards({
  data,
  showDate = false,
  showButtons = false,
  onSelection = () => {},
  numberSelected = 0,
  selected: isSelected = false,
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
    homeTeamId,
    awayTeamId,
  } = data;

  const league = teamSelectedId.split('-')[0] || 'DEFAULT';
  const show = typeof data.show === 'boolean' ? data.show : data.show === 'true';

  const getContrastShadow = (hexColor: string) => {
    if (!hexColor || typeof hexColor !== 'string') return 'rgba(0, 0, 0, 0.3)';

    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }

    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness > 128 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.5)';
  };

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

    return () => {};
  }, []);

  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  const isFavorite =
    !!startTimeUTC && !showDate ? favoriteTeams.includes(homeTeamId) || favoriteTeams.includes(awayTeamId) : false;

  const isCardSelected = isSelected && !showButtons;
  const isSelectable = !isSelected && !showButtons;

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

  const colorsTeamSelected = (Colors[teamSelectedId] ?? {}) as TeamColors;
  const teamClrs =
    Object.keys(colorsTeamSelected).length > 0
      ? { color: colorsTeamSelected.color, backgroundColor: colorsTeamSelected.backgroundColor }
      : { color: `#${color}`, backgroundColor: `#${backgroundColor}` };
  const colorTeam = teamClrs.backgroundColor && teamClrs.backgroundColor !== '' ? teamClrs : Colors['default'];

  let shadowColor = show ? getContrastShadow(colorsTeamSelected.backgroundColor || '#FFFFFF') : '#000000';
  let cardClass = show
    ? {
        ...colorTeam,
        fontSize,
      }
    : {
        fontSize,
        opacity: '0.97',
        backgroundColor: '#ffffee',
      };

  let selectedCard = isCardSelected
    ? {
        filter: 'brightness(0.5) saturate(1) contrast(1.05)',
      }
    : {};

  let favoriteCardStyle =
    isFavorite || isCardSelected
      ? {
          border: 'double' + colorTeam?.color,
          borderWidth: 3,
          borderStyle: 'solid',
          boxShadow: `0px 0px 9px #FFD700`,
        }
      : {};

  const displayTitle = () => {
    const now = new Date();
    const todayEnd = new Date(data.startTimeUTC);
    todayEnd.setHours(todayEnd.getHours() + timeDurationEnum[data.league as keyof typeof timeDurationEnum]);

    let displayDate = gameDate;

    if (data.startTimeUTC) {
      const startTime = new Date(data.startTimeUTC);

      if (now >= startTime) {
        displayDate = now > todayEnd ? translateWord('ended') : translateWord('inProgress');
      }
    }

    if (arenaName && arenaName !== '') {
      return (
        <Card.Title style={{ ...cardClass }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (showButtons) generateICSFile(data);
            }}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (showButtons) generateICSFile(data);
              }
            }}
            aria-label="Generate ICS file"
            style={{
              cursor: 'pointer',
              textDecoration: showButtons ? 'underline' : 'none',
              color: 'inherit',
              backgroundColor: 'inherit',
              border: 'none',
              font: 'inherit',
              padding: 0,
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: isSmallDevice ? 5 : 10,
            }}
          >
            {showButtons && (
              <Icon
                name="calendar"
                type="font-awesome"
                style={{ paddingRight: isSmallDevice ? 5 : 10 }}
                size={isSmallDevice ? 10 : 15}
                color={colorTeam?.color}
              />
            )}
            {displayDate}
          </div>
        </Card.Title>
      );
    }
    return <Card.Title style={{ fontSize }}>{gameDate}</Card.Title>;
  };

  const renderTeamStar = () => (
    <View style={{ marginLeft: 5, justifyContent: 'center', alignItems: 'center' }}>
      <Icon name="star" type="font-awesome" size={12} color="#ffd900c0" />
      <Icon
        name="star"
        type="font-awesome"
        size={10}
        color="#FFD700"
        containerStyle={{ position: 'absolute' }}
      />
    </View>
  );

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
        <View>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (showDate && show) {
                onSelection(data);
              }
            }}
            onKeyDown={(e: any) => {
              if ((e.key === 'Enter' || e.key === ' ') && showDate && show) {
                e.preventDefault();
                onSelection(data);
              }
            }}
            aria-disabled={!showDate}
            style={{
              cursor: show ? 'pointer' : 'not-allowed',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              height: 160,
              backgroundColor: 'transparent',
              padding: 0,
              margin: 0,
            }}
          >
            {/* Away Team Logo Container */}
            <div
              style={{
                position: 'relative',
                width: '50%',
                height: 50,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                style={{
                  width: '100%',
                  height: '100%',
                  filter: 'brightness(1.1) ' + 'contrast(1.2) ' + `drop-shadow(0 0 2px ${shadowColor})`,
                }}
                resizeMode="contain"
                source={awayTeamLogo ? { uri: awayTeamLogo } : defaultLogo}
              />
              {!awayTeamLogo && (
                <Text
                  style={{
                    position: 'absolute',
                    fontWeight: 'bolder',
                    fontSize: isSmallDevice ? 10 : 12,
                    color: '#ffffff',
                    textAlign: 'center',
                  }}
                >
                  {awayTeamShort}
                </Text>
              )}
            </div>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold' }}>{teamNameAway}</Text>
              {(!showButtons || !isFavorite) && favoriteTeams.includes(awayTeamId) && renderTeamStar()}
            </View>
            <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold' }}>@</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold' }}>{teamNameHome}</Text>
              {(!showButtons || !isFavorite) && favoriteTeams.includes(homeTeamId) && renderTeamStar()}
            </View>

            {/* Home Team Logo Container */}
            <div
              style={{
                position: 'relative',
                width: '50%',
                height: 50,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                style={{
                  width: '100%',
                  height: '100%',
                  filter: `drop-shadow(0 0 2px ${shadowColor})`,
                }}
                resizeMode="contain"
                source={homeTeamLogo ? { uri: homeTeamLogo } : defaultLogo}
              />
              {!homeTeamLogo && (
                <Text
                  style={{
                    position: 'absolute',
                    fontWeight: 'bold',
                    fontSize: isSmallDevice ? 10 : 12,
                    color: '#ffffff',
                    textAlign: 'center',
                  }}
                >
                  {homeTeamShort}
                </Text>
              )}
            </div>
            <br />
          </div>
          <Text
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              height: 20,
            }}
          >
            <a
              href={`https://maps.google.com/?q=${stadiumSearch}`}
              style={{
                cursor: 'pointer',
                textDecoration: 'none',
                color: cardClass.color,
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
                color={cardClass.color}
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

  const renderIcon = (name: string, iconColor: string, right: number) => (
    <View
      style={{
        position: 'absolute',
        top: -10,
        right,
        zIndex: 10,
      }}
    >
      <Icon
        name={name}
        type="font-awesome"
        color="#000"
        size={22}
        containerStyle={{ position: 'absolute', top: -1, left: -1 }}
      />
      <Icon name={name} type="font-awesome" color={iconColor} size={20} />
    </View>
  );

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
          ...favoriteCardStyle,
          ...selectedCard,
          ...cardClass,
          height: 270,
        }}
        wrapperStyle={cardClass}
      >
        {!!startTimeUTC && !showDate && (
          <Image
            source={leagueLogos[league as keyof typeof leagueLogos] || leagueLogos.DEFAULT}
            style={{
              height: 20,
              width: 40,
              resizeMode: 'contain',
              position: 'absolute',
              top: -10,
              left: -10,
              backgroundColor: league === League.WNBA ? '#F0F0F0' : 'transparent',
            }}
            accessibilityLabel={`${league} logo`}
          />
        )}
        {isFavorite && renderIcon('star', '#FFD700', -10)}
        {show &&
          (isSelected || isSelectable) &&
          !(isFavorite && isCardSelected) &&
          renderIcon(isSelected ? 'check-square' : 'plus-square-o', colorTeam?.color || 'white', isFavorite ? 15 : -10)}
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
        <Card.Divider style={{ backgroundColor: colorTeam?.color }} />
        {displayContent()}
      </Card>
    </div>
  );
}
