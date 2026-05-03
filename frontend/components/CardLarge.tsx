import { ThemedText } from '@/components/ThemedText';
import { GameStatus, leagueLogos } from '@/constants/enum';
import { getGamesStatus } from '@/utils/date';
import { getCache } from '@/utils/fetchData';
import { CardsProps, GameFormatted } from '@/utils/types';
import { addFavoriteTeam, translateWord } from '@/utils/utils';
import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import GameModal from './GameModal';

export default function CardLarge({
  data,
  showDate = false,
  showScores: propShowScores,
  forceShowScores = false,
  onSelection,
  isSelected: propIsSelected,
  animateExit = false,
  animateEntry = false,
  verticalMode = false,
  showTime = false,
  delay = 0,
}: Readonly<CardsProps & { showTime?: boolean; showScores?: boolean; delay?: number }>) {
  let { homeTeamShort, awayTeamShort } = data;
  const {
    homeTeamLogo,
    awayTeamLogo,
    homeTeamLogoDark,
    awayTeamLogoDark,
    homeTeamScore,
    awayTeamScore,
    arenaName = '',
    startTimeUTC,
    teamSelectedId,
    homeTeamId,
    awayTeamId,
    homeTeamRecord,
    awayTeamRecord,
    awayTeamColor,
    homeTeamColor,
    awayTeamBackgroundColor,
    homeTeamBackgroundColor,
    placeName = '',
    league,
    urlLive,
    gameStatus,
    gameClock,
    gamePeriod,
  } = data;

  if (league.includes('OLYMPICS')) {
    const suffix = league.includes('WOMEN') ? '-W' : '-M';
    if (homeTeamShort && !homeTeamShort.endsWith(suffix)) {
      homeTeamShort += suffix;
    }
    if (awayTeamShort && !awayTeamShort.endsWith(suffix)) {
      awayTeamShort += suffix;
    }
  }
  const emptyCard = !homeTeamShort && !awayTeamShort;
  const { width } = useWindowDimensions();
  const theme = useColorScheme() ?? 'light';
  const isMedium = width >= 768 && width < 1200;
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);
  const [gamesSelected, setGamesSelected] = useState<GameFormatted[]>(
    () => getCache<GameFormatted[]>('gameSelected') || [],
  );
  const [showScores, setShowScores] = useState<boolean>(() => {
    if (propShowScores !== undefined) return propShowScores;
    const cached = getCache<boolean>('showScores');
    return cached ?? true;
  });

  useEffect(() => {
    if (propShowScores !== undefined) {
      setShowScores(propShowScores);
    }
  }, [propShowScores]);

  useEffect(() => {
    if (propShowScores !== undefined) return;

    const updateScores = () => {
      setShowScores(getCache<boolean>('showScores') ?? true);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('scoresUpdated', updateScores);
      return () => globalThis.window.removeEventListener('scoresUpdated', updateScores);
    }
  }, [propShowScores]);

  const [modalVisible, setModalVisible] = useState(false);
  const [scoreRevealed, setScoreRevealed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(animateEntry ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(animateEntry ? 0.95 : 1)).current;
  const translateYAnim = useRef(new Animated.Value(animateEntry ? 20 : 0)).current;
  const selectionPulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [cardWidth, setCardWidth] = useState(0);
  const isSmallCard = cardWidth > 0 && cardWidth < 190;
  const viewRef = useRef<View>(null);
  const [hasBeenSeen, setHasBeenSeen] = useState(!animateEntry);

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  useEffect(() => {
    const updateSelected = () => {
      setGamesSelected(getCache<GameFormatted[]>('gameSelected') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('gamesSelectedUpdated', updateSelected);
      return () => globalThis.window.removeEventListener('gamesSelectedUpdated', updateSelected);
    }
  }, []);

  useEffect(() => {
    const isWeb = Platform.OS === 'web';
    if (!animateEntry || !isWeb || !viewRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenSeen(true);
          // Very important: stop observing once seen to free up resources
          if (viewRef.current) observer.unobserve(viewRef.current as any);
        }
      },
      { threshold: 0.01, rootMargin: '250px' }, // Anticipate scroll much earlier (250px)
    );

    observer.observe(viewRef.current as any);

    return () => observer.disconnect();
  }, [animateEntry]);

  useEffect(() => {
    if (animateEntry) {
      if (hasBeenSeen) {
        // Appearance animation
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
            Animated.timing(translateYAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]).start();
      }
    }
  }, [hasBeenSeen, animateEntry, fadeAnim, scaleAnim, translateYAnim, delay]);

  const isFavorite = favoriteTeams.includes(homeTeamId) || favoriteTeams.includes(awayTeamId);
  const isSelected =
    propIsSelected ??
    gamesSelected.some((g) => g.homeTeamId === data.homeTeamId && g.startTimeUTC === data.startTimeUTC);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(selectionPulse, { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.spring(selectionPulse, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  useEffect(() => {
    if (!showScores) {
      setScoreRevealed(false);
    }
  }, [showScores]);

  const hasScore = homeTeamScore != null && awayTeamScore != null;
  const status = getGamesStatus(data);
  const now = new Date();
  const start = new Date(startTimeUTC);
  const isToday = now.toDateString() === start.toDateString();
  const diffHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  const isLive =
    (status === GameStatus.IN_PROGRESS ||
      (!!gameStatus &&
        ['Top', 'Bot', 'Mid', 'End', '1st', '2nd', '3rd', '4th', 'OT', 'Half', "'", 'In SO'].some((s) =>
          gameStatus.includes(s),
        ) &&
        !gameStatus.toUpperCase().includes('FINAL') &&
        !gameStatus.toUpperCase().includes('ENDED')) ||
      (hasScore && isToday && status !== GameStatus.FINAL && status !== GameStatus.FINISHED)) &&
    diffHours < 5;

  useEffect(() => {
    if (isLive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isLive, pulseAnim]);

  let timeText = '';
  const isGameStatusFinal = gameStatus?.toUpperCase().includes('FINAL') || gameStatus?.toUpperCase().includes('ENDED');
  const isGameStatusLive =
    gameStatus &&
    ['Top', 'Bot', 'Mid', 'End', '1st', '2nd', '3rd', '4th', 'OT', 'Half', "'", 'In SO'].some((s) =>
      gameStatus.includes(s),
    ) &&
    !isGameStatusFinal;

  const hasPeriodInGameStatus = (status?: string) => {
    if (!status) return false;
    return /\b(1st|2nd|3rd|4th|OT|SO|HT|Half|Top|Bot|Mid|End|P\d+)\b/i.test(status);
  };

  const gameStatusAlreadyIncludesClock = (status?: string, clock?: string) => {
    if (!status || !clock) return false;
    const normalizedStatus = status.toLowerCase();
    const normalizedClock = clock.toLowerCase();
    const variants = [normalizedClock];
    if (normalizedClock.startsWith('00:')) {
      variants.push(normalizedClock.replace(/^00:/, ''));
    }
    if (normalizedClock.startsWith('0:')) {
      variants.push(normalizedClock.replace(/^0:/, ''));
    }
    return variants.some((variant) => normalizedStatus.includes(variant));
  };

  const livePeriodText = gameStatus || (typeof gamePeriod === 'number' ? `P${gamePeriod}` : '');
  const isStarted4hAgo = diffHours > 4;
  const serviceReportsNotTerminated =
    isGameStatusLive ||
    (!!gameStatus &&
      !isGameStatusFinal &&
      gameStatus !== 'FINAL' &&
      gameStatus !== 'FINISHED' &&
      gameStatus !== 'ENDED');
  const showFinalization = !hasScore && serviceReportsNotTerminated && isStarted4hAgo;

  if (showFinalization) {
    timeText = translateWord('final');
  } else if ((status === GameStatus.FINISHED || status === GameStatus.FINAL) && hasScore) {
    timeText = translateWord('gameDetails');
  } else if (isStarted4hAgo && !serviceReportsNotTerminated) {
    // If we have gameStatus or gamePeriod info, display it instead of generic "ended"
    if (gameStatus && typeof gamePeriod === 'number') {
      timeText = hasPeriodInGameStatus(gameStatus) ? gameStatus : `${gameStatus} - P${gamePeriod}`;
    } else if (gameStatus) {
      timeText = gameStatus;
    } else if (typeof gamePeriod === 'number') {
      timeText = `P${gamePeriod}`;
    } else {
      timeText = translateWord('ended');
    }
  } else if (isGameStatusLive || isLive) {
    if (gameClock && livePeriodText) {
      if (gameStatusAlreadyIncludesClock(livePeriodText, gameClock)) {
        timeText = livePeriodText;
      } else {
        timeText = `${gameClock} - ${livePeriodText}`;
      }
    } else if (gameClock) {
      timeText = `${gameClock}`;
    } else if (livePeriodText) {
      timeText = livePeriodText;
    } else {
      timeText = translateWord('inProgress');
    }
  } else if (hasScore) {
    if (isToday) {
      // Display gameStatus and gamePeriod if available, otherwise show inProgress
      if (gameStatus && typeof gamePeriod === 'number') {
        timeText = hasPeriodInGameStatus(gameStatus) ? gameStatus : `${gameStatus} - P${gamePeriod}`;
      } else if (gameStatus) {
        timeText = gameStatus;
      } else if (typeof gamePeriod === 'number') {
        timeText = `P${gamePeriod}`;
      } else {
        timeText = translateWord('inProgress');
      }
    } else {
      timeText = translateWord('final');
    }
  } else if (startTimeUTC) {
    timeText = showDate
      ? showTime
        ? new Date(startTimeUTC).toLocaleString(undefined, {
            day: 'numeric',
            month: width > 1008 ? 'short' : 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date(startTimeUTC).toLocaleDateString(undefined, {
            day: 'numeric',
            month: width > 1008 ? 'short' : 'numeric',
          })
      : new Date(startTimeUTC).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (!timeText) timeText = '\u00A0';

  const leagueKey = (data.league || 'DEFAULT') as keyof typeof leagueLogos;
  const leagueLogo = leagueLogos[leagueKey] || leagueLogos.DEFAULT;

  const isSelectedTeam = teamSelectedId === homeTeamId;
  const isDark = theme === 'dark';
  const baseColor = isDark ? (isSelectedTeam ? '#0f172a' : '#1e293b') : isSelectedTeam ? '#e2e8f0' : '#f1f5f9';
  const revertColor = isDark ? (isSelectedTeam ? '#1e293b' : '#0f172a') : isSelectedTeam ? '#cbd5e1' : '#e2e8f0';

  const mutedTextColor = isDark ? '#94a3b8' : '#64748b';

  const shadowColor = 'rgba(255, 255, 255, 0.5)';
  const logoStyle = { filter: `brightness(1.1) contrast(1.2) drop-shadow(0 0 1px ${shadowColor})` } as any;
  const leagueLogoStyle =
    leagueKey === 'PWHL' && isDark
      ? ({ filter: 'brightness(0) invert(1)' } as any)
      : ({ filter: `brightness(1.1) contrast(1.2)` } as any);

  const getBrightness = (hexColor: string) => {
    if (!hexColor) return 0;
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
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  const formatColor = (c: string | undefined) => {
    if (!c) return baseColor;
    return c.startsWith('#') ? c : `#${c}`;
  };

  const getAdaptiveColor = (c1: string | undefined, c2: string | undefined) => {
    const color1 = formatColor(c1);
    const color2 = formatColor(c2);
    const b1 = getBrightness(color1);
    const b2 = getBrightness(color2);
    return isDark ? (b1 > b2 ? color1 : color2) : b1 < b2 ? color1 : color2;
  };

  const awayColorHex = getAdaptiveColor(awayTeamColor, awayTeamBackgroundColor);
  const homeColorHex = getAdaptiveColor(homeTeamColor, homeTeamBackgroundColor);
  const backGroundColor = favoriteTeams.includes(homeTeamId)
    ? homeColorHex
    : favoriteTeams.includes(awayTeamId)
      ? awayColorHex
      : 'transparent';

  let gradientStyle = {
    backgroundColor: baseColor,
    backgroundImage: `linear-gradient(90deg, ${awayColorHex} 0%, ${baseColor} 1%, ${baseColor} 99%, ${homeColorHex} 100%)`,
  };

  if (emptyCard) {
    gradientStyle = {
      backgroundColor: baseColor,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      borderColor: revertColor,
      cursor: 'default',
    };
  }

  const displayHomeLogo = isDark && homeTeamLogoDark ? homeTeamLogoDark : homeTeamLogo;
  const displayAwayLogo = isDark && awayTeamLogoDark ? awayTeamLogoDark : awayTeamLogo;

  const stadiumSearch = arenaName.replace(/\s+/g, '+') + ',' + placeName.replace(/\s+/g, '+');

  const shouldShowReveal =
    hasScore && !forceShowScores && (!showScores || (showScores && isFavorite && !isLive)) && !scoreRevealed;

  const centerContent = (
    <>
      <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
        {shouldShowReveal ? (
          <TouchableOpacity
            style={styles.revealButton}
            onPress={(e) => {
              e.stopPropagation();
              setScoreRevealed(true);
            }}
          >
            <Icon name="eye" type="font-awesome" size={verticalMode ? 20 : 30} color={isDark ? '#94a3b8' : '#475569'} />
            <ThemedText lightColor="#475569" darkColor="#94a3b8" style={styles.revealText}>
              {gameStatus === 'FINISHED' ? translateWord('score') : translateWord('currentScore')}
            </ThemedText>
          </TouchableOpacity>
        ) : hasScore ? (
          <View style={styles.scoreRow}>
            <ThemedText
              lightColor="#0f172a"
              darkColor="#ffffff"
              style={[styles.scoreNumber, (isMedium || verticalMode) && { fontSize: 28 }]}
            >
              {awayTeamScore}
            </ThemedText>
            <ThemedText
              lightColor="#475569"
              darkColor="#CBD5E1"
              style={[styles.scoreDivider, (isMedium || verticalMode) && { fontSize: 18, marginHorizontal: 5 }]}
            >
              -
            </ThemedText>
            <ThemedText
              lightColor="#0f172a"
              darkColor="#ffffff"
              style={[styles.scoreNumber, (isMedium || verticalMode) && { fontSize: 28 }]}
            >
              {homeTeamScore}
            </ThemedText>
          </View>
        ) : (
          <ThemedText
            lightColor="#475569"
            darkColor="#CBD5E1"
            style={[styles.vsText, (isMedium || verticalMode) && { fontSize: 20 }]}
          >
            @
          </ThemedText>
        )}
      </View>

      <View
        style={[
          styles.timeContainer,
          { backgroundColor: revertColor },
          isSmallCard && { paddingHorizontal: 2, paddingVertical: 2, marginTop: 2 },
        ]}
      >
        {urlLive ? (
          <a
            href={urlLive}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: 'none',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setScoreRevealed(true);
            }}
          >
            <ThemedText style={[styles.liveTimeText, isSmallCard && { fontSize: 10 }]}>
              {timeText.split(',')[0].trim()}
            </ThemedText>
          </a>
        ) : (
          <ThemedText
            lightColor={isLive ? undefined : '#475569'}
            darkColor={isLive ? undefined : '#94a3b8'}
            style={[isLive ? styles.liveTimeText : styles.timeText, isSmallCard && { fontSize: 10 }]}
          >
            {timeText}
          </ThemedText>
        )}
      </View>
    </>
  );

  const bookmarkElement =
    status === GameStatus.SCHEDULED && (isSelected || onSelection) ? (
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: isSmallCard ? 0 : 8,
          paddingVertical: 4,
        }}
      >
        <Icon
          name={isSelected ? 'bookmark' : 'bookmark-o'}
          type="font-awesome"
          size={20}
          color={isDark ? '#ffffff' : '#0f172a'}
          style={
            isSelected
              ? {
                  textShadowColor: homeColorHex,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 3,
                }
              : {}
          }
        />
      </View>
    ) : null;

  return (
    <Animated.View
      ref={viewRef}
      style={
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { scale: selectionPulse }, { translateY: translateYAnim }],
          willChange: animateEntry ? 'opacity, transform' : 'auto', // GPU optimization
        } as any
      }
      onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
    >
      <Card
        containerStyle={[
          styles.cardContainer,
          {
            padding: 0,
            backgroundColor: 'transparent',
            borderWidth: 0,
            shadowColor: backGroundColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 10,
            elevation: 5,
            boxShadow: backGroundColor === 'transparent' ? 'none' : `0px 0px 5px ${backGroundColor}`,
          },
        ]}
        wrapperStyle={{ padding: 0 }}
      >
        <Pressable
          onPress={() => {
            if (onSelection) {
              if (data.homeTeamShort && data.awayTeamShort) {
                if (animateExit) {
                  Animated.parallel([
                    Animated.timing(fadeAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                      toValue: 0.95,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                  ]).start(() => onSelection(data));
                } else {
                  onSelection(data);
                }
              }
            } else {
              setModalVisible(true);
              if (hasScore) {
                setScoreRevealed(true);
              }
            }
          }}
        >
          <View style={[{ padding: isSmallCard ? 5 : 15, borderRadius: 20 }, gradientStyle]}>
            <div style={emptyCard ? styles.invisible : {}}>
              {/* Header: League Logo & Live Badge */}
              <View style={[styles.headerRow, isSmallCard && { justifyContent: 'flex-end' }]}>
                {!isSmallCard && (
                  <View style={[styles.leagueBadge, isSmallCard && { paddingHorizontal: 0 }]}>
                    <Image source={leagueLogo} style={[styles.leagueIcon, leagueLogoStyle]} resizeMode="contain" />
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isLive && (
                    <View style={[styles.liveBadge, isSmallCard && { paddingHorizontal: 0 }]}>
                      <Animated.View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 4,
                          backgroundColor: '#ef4444',
                          opacity: pulseAnim,
                        }}
                      />
                    </View>
                  )}
                  {bookmarkElement}
                  <TouchableOpacity
                    style={{ paddingHorizontal: isSmallCard ? 2 : 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      setModalVisible(true);
                      if (hasScore) {
                        setScoreRevealed(true);
                      }
                    }}
                  >
                    <Icon name="ellipsis-v" type="font-awesome" size={18} color={mutedTextColor} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Main Content: Teams & Score/Time */}
              <View style={[styles.mainRow, verticalMode && { flexDirection: 'column' }]}>
                {/* away Team */}
                <View
                  style={[
                    styles.teamColumn,
                    verticalMode && {
                      flexDirection: 'row',
                      minHeight: 40,
                      justifyContent: isSmallCard ? 'center' : 'flex-start',
                      width: '100%',
                      paddingLeft: isSmallCard ? 0 : 20,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.logoPlaceholder,
                      verticalMode && {
                        width: 40,
                        height: 40,
                        marginBottom: 0,
                        marginRight: isSmallCard ? 0 : 10,
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <Image
                      source={displayAwayLogo ? { uri: displayAwayLogo } : require('../assets/images/default_logo.png')}
                      style={[
                        styles.teamLogo,
                        logoStyle,
                        isMedium && { width: 45, height: 45, marginBottom: 4 },
                        verticalMode && { width: 35, height: 35, marginBottom: 0 },
                      ]}
                    />
                  </View>
                  {!isSmallCard && (
                    <View style={styles.nameContainer}>
                      <ThemedText
                        lightColor="#0f172a"
                        darkColor="#ffffff"
                        style={[styles.teamName, isMedium && { fontSize: 14 }]}
                        numberOfLines={1}
                      >
                        {awayTeamShort || '\u00A0'}
                      </ThemedText>
                      <Icon
                        onPress={(e) => {
                          e?.stopPropagation();
                          addFavoriteTeam(favoriteTeams, awayTeamId);
                        }}
                        name={favoriteTeams.includes(awayTeamId) ? 'star' : 'star-o'}
                        type="font-awesome"
                        size={14}
                        color={favoriteTeams.includes(awayTeamId) ? '#FFD700' : '#94a3b8'}
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  )}
                  {!isSmallCard && (
                    <ThemedText
                      lightColor="#475569"
                      darkColor="#94a3b8"
                      style={[styles.recordText, verticalMode && { marginLeft: 10, marginTop: 0, height: 'auto' }]}
                    >
                      {(forceShowScores || (showScores && !isFavorite) || scoreRevealed ? awayTeamRecord : '\u00A0') ||
                        '\u00A0'}
                    </ThemedText>
                  )}
                </View>

                {/* Center: Score or VS/@ */}
                <View style={[styles.centerColumn, verticalMode && { flex: 0, marginVertical: 5, width: '100%' }]}>
                  {centerContent}
                </View>

                {/* home Team */}
                <View
                  style={[
                    styles.teamColumn,
                    verticalMode && {
                      flexDirection: 'row',
                      minHeight: 40,
                      justifyContent: isSmallCard ? 'center' : 'flex-start',
                      width: '100%',
                      paddingLeft: isSmallCard ? 0 : 20,
                      alignItems: 'center',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.logoPlaceholder,
                      verticalMode && {
                        width: 40,
                        height: 40,
                        marginBottom: 0,
                        marginRight: isSmallCard ? 0 : 10,
                        alignSelf: 'center',
                      },
                    ]}
                  >
                    <Image
                      source={displayHomeLogo ? { uri: displayHomeLogo } : require('../assets/images/default_logo.png')}
                      style={[
                        styles.teamLogo,
                        logoStyle,
                        isMedium && { width: 45, height: 45, marginBottom: 4 },
                        verticalMode && { width: 35, height: 35, marginBottom: 0 },
                      ]}
                    />
                  </View>
                  {!isSmallCard && (
                    <View style={styles.nameContainer}>
                      <ThemedText
                        lightColor="#0f172a"
                        darkColor="#ffffff"
                        style={[styles.teamName, isMedium && { fontSize: 14 }]}
                        numberOfLines={1}
                      >
                        {homeTeamShort || '\u00A0'}
                      </ThemedText>
                      <Icon
                        onPress={(e) => {
                          e?.stopPropagation();
                          addFavoriteTeam(favoriteTeams, homeTeamId);
                        }}
                        name={favoriteTeams.includes(homeTeamId) ? 'star' : 'star-o'}
                        type="font-awesome"
                        size={14}
                        color={favoriteTeams.includes(homeTeamId) ? '#FFD700' : '#94a3b8'}
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  )}
                  {!isSmallCard && (
                    <ThemedText
                      lightColor="#475569"
                      darkColor="#94a3b8"
                      style={[styles.recordText, verticalMode && { marginLeft: 10, marginTop: 0, height: 'auto' }]}
                    >
                      {(forceShowScores || (showScores && !isFavorite) || scoreRevealed ? homeTeamRecord : '\u00A0') ||
                        '\u00A0'}
                    </ThemedText>
                  )}
                </View>
              </View>

              {/* Footer: Arena */}
              <View style={[styles.footer, { borderTopColor: revertColor }]}>
                {arenaName ? (
                  <a
                    href={`https://maps.google.com/?q=${stadiumSearch}`}
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      width: '100%',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ThemedText
                      lightColor="#475569"
                      darkColor="#CBD5E1"
                      style={[styles.arenaText, verticalMode && { fontSize: 10 }]}
                      numberOfLines={1}
                    >
                      {isSmallCard ? '' : '📍 '}
                      {arenaName || '\u00A0'}
                    </ThemedText>
                  </a>
                ) : (
                  <ThemedText
                    lightColor="#475569"
                    darkColor="#CBD5E1"
                    style={[styles.arenaText, verticalMode && { fontSize: 10 }]}
                    numberOfLines={1}
                  >
                    {(isSmallCard ? '' : '📍 ') + (arenaName || '\u00A0')}
                  </ThemedText>
                )}
              </View>
            </div>
          </View>
        </Pressable>
      </Card>
      <GameModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={data}
        gradientStyle={gradientStyle}
        favoriteTeams={favoriteTeams}
        showScores={showScores}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0f172a', // Very dark blue
    borderRadius: 20,
    borderWidth: 0,
    marginHorizontal: 10,
    padding: 15,
    height: 'auto',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'center',
    height: 30,
  },
  leagueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  leagueIcon: {
    height: 20,
    width: 30,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 'bold',
    textOverflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    minHeight: 180,
  },

  teamLogo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  recordText: {
    fontSize: 11,
    marginTop: 2,
    height: 15,
    textAlign: 'center',
  },
  centerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  vsText: {
    fontSize: 32,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  revealButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealText: {
    fontSize: 12,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: '700',
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  timeContainer: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 0,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  liveTimeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 5,
    alignItems: 'center',
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  arenaText: {
    fontSize: 12,
    lineHeight: 14,
  },
  bookmarkBadge: {
    borderRadius: 20,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
    height: 140,
    justifyContent: 'flex-start',
    marginTop: 'auto',
  },
  logoPlaceholder: {
    width: 70,
    height: 70,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 25,
    justifyContent: 'center',
  },
  invisible: {
    opacity: 0,
  },
});
