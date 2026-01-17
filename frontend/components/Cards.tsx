import { League, leagueLogos, timeDurationEnum } from '@/constants/enum';
import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Text, View } from 'react-native';
import { Colors, TeamColors } from '../constants/Colors';
import { getCache } from '../utils/fetchData';
import { CardsProps } from '../utils/types';
import { generateICSFile, translateWord } from '../utils/utils';
const defaultLogo = require('../assets/images/default_logo.png');

export default function Cards({
  data,
  showDate = false,
  showButtons = false,
  onSelection = () => {},
  numberSelected = 0,
  selected: isSelected = false,
  disableSelection = false,
}: Readonly<CardsProps & { disableSelection?: boolean }>) {
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
    homeTeamScore,
    awayTeamScore,
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
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateDeviceType = () => {
      const { width } = Dimensions.get('window');
      setTeamNameHome(homeTeam);
      setTeamNameAway(awayTeam);
      if (width <= 1075) {
        if (width <= 768) {
          setTeamNameHome(homeTeam);
          setTeamNameAway(awayTeam);
        } else {
          setTeamNameHome(homeTeamShort || homeTeam);
          setTeamNameAway(awayTeamShort || awayTeam);
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

  // If both scores are present and not null/undefined, display scores instead of team names
  const hasScore = homeTeamScore != null && awayTeamScore != null && homeTeamScore !== '' && awayTeamScore !== '';
  const displayHomeLabel = hasScore ? String(homeTeamScore) : teamNameHome;
  const displayAwayLabel = hasScore ? String(awayTeamScore) : teamNameAway;
  const displayHomeShort = hasScore ? String(homeTeamScore) : homeTeamShort;
  const displayAwayShort = hasScore ? String(awayTeamScore) : awayTeamShort;

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

  const renderTitleContent = () => {
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
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if (showButtons) {
              e.stopPropagation();
              generateICSFile(data);
            }
          }}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (showButtons) {
                e.stopPropagation();
                generateICSFile(data);
              }
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
            justifyContent: 'center',
            width: '100%',
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
      );
    }
    return gameDate;
  };

  const renderTeamStar = () => (
    <View style={{ marginLeft: 5, justifyContent: 'center', alignItems: 'center' }}>
      <Icon name="star" type="font-awesome" size={12} color="#ffd900c0" />
      <Icon name="star" type="font-awesome" size={10} color="#FFD700" containerStyle={{ position: 'absolute' }} />
    </View>
  );

  const displayContent = () => {
    if (homeTeam && awayTeam) {
      const stadiumSearch = arenaName.replace(/\s+/g, '+') + ',' + placeName.replace(/\s+/g, '+');
      const showAwayStar = (!showButtons || !isFavorite) && favoriteTeams.includes(awayTeamId);
      const showHomeStar = (!showButtons || !isFavorite) && favoriteTeams.includes(homeTeamId);
      return (
        <View>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (showDate && show && !disableSelection) {
                onSelection(data);
              }
            }}
            onKeyDown={(e: any) => {
              if ((e.key === 'Enter' || e.key === ' ') && showDate && show && !disableSelection) {
                e.preventDefault();
                onSelection(data);
              }
            }}
            aria-disabled={!showDate}
            style={{
              cursor: show
                ? (showDate || !showButtons || isSelected) && !disableSelection
                  ? 'pointer'
                  : 'default'
                : 'not-allowed',
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
                  {displayAwayShort}
                </Text>
              )}
            </div>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {showAwayStar && <View style={{ width: 17 }} />}
              <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold', textAlign: 'center' }}>
                {displayAwayLabel}
              </Text>
              {showAwayStar && renderTeamStar()}
            </View>
            <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold' }}>@</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {showHomeStar && <View style={{ width: 17 }} />}
              <Text style={{ ...cardClass, backgroundColor: 'transparent', fontWeight: 'bold', textAlign: 'center' }}>
                {displayHomeLabel}
              </Text>
              {showHomeStar && renderTeamStar()}
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
                  {displayHomeShort}
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
              width: '100%',
              paddingHorizontal: 5,
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
                width: '100%',
                overflow: 'hidden',
                justifyContent: 'center',
              }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
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
                  margin: 0,
                  padding: 0,
                }}
              >
                {arenaName || 'Stadium not found'}
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

  const renderIcon = (name: string, iconColor: string) => (
    <View
      style={{
        marginLeft: 5,
        width: 22,
        height: 22,
      }}
    >
      <Icon name={name} type="font-awesome" color={iconColor} size={20} />
    </View>
  );

  const renderActionIcons = () => (
    <View style={{ flexDirection: 'row' }}>
      {show &&
        (isSelected || isSelectable) &&
        !(isFavorite && isCardSelected) &&
        renderIcon(isSelected ? 'check-square' : 'plus-square-o', colorTeam?.color || 'white')}
      {isFavorite && renderIcon('star', '#FFD700')}
    </View>
  );

  const hasLeagueLogo = !!startTimeUTC && !showDate;
  const isWideLayout = !isSmallDevice && containerWidth > 320;

  return (
    <div className={cardClass}>
      <Card
        onClick={() => {
          if (show && (!showButtons || isSelected) && !disableSelection) {
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
        <View
          onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
          style={{
            flexDirection: isWideLayout ? 'row' : 'column',
            justifyContent: isWideLayout ? 'space-between' : 'center',
            alignItems: isWideLayout ? 'center' : 'stretch',
            marginBottom: 5,
            marginTop: -10,
            marginLeft: -10,
            marginRight: -10,
            minHeight: 30,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: isWideLayout ? 0 : 5,
            }}
          >
            <View>
              {hasLeagueLogo && (
                <Image
                  source={leagueLogos[league as keyof typeof leagueLogos] || leagueLogos.DEFAULT}
                  style={{
                    height: 20,
                    width: 40,
                    resizeMode: 'contain',
                    backgroundColor: league === League.WNBA ? '#F0F0F0' : 'transparent',
                  }}
                  accessibilityLabel={`${league} logo`}
                />
              )}
            </View>
            {!isWideLayout && renderActionIcons()}
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Card.Title
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: showDate ? '' : 'flex',
                whiteSpace: showDate ? '' : 'nowrap',
                alignItems: showDate ? '' : 'center',
                justifyContent: showDate ? '' : 'center',
                marginBottom: 0,
                ...(arenaName && arenaName !== '' ? cardClass : { fontSize }),
              }}
            >
              {renderTitleContent()}
            </Card.Title>
          </View>

          {isWideLayout && renderActionIcons()}
        </View>
        <Card.Divider style={{ backgroundColor: colorTeam?.color, marginBottom: 5 }} />
        {displayContent()}
      </Card>
    </div>
  );
}
