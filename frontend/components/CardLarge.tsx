import { leagueLogos } from '@/constants/enum';
import { getGamesStatus } from '@/utils/date';
import { getCache } from '@/utils/fetchData';
import { CardsProps } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CardLarge({ data, showDate = false }: Readonly<CardsProps>) {
  const {
    homeTeamShort,
    awayTeamShort,
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
    placeName = '',
    gameDate: gameDateStr,
  } = data;

  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => getCache<string[]>('favoriteTeams') || []);
  const [scoreRevealed, setScoreRevealed] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  const hasScore = homeTeamScore != null && awayTeamScore != null;
  const status = getGamesStatus(data);
  const isLive = status === 'IN_PROGRESS';

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
  if (status === 'FINAL') {
    timeText = translateWord('ended');
  } else if (status === 'IN_PROGRESS') {
    timeText = 'live';
  } else if (startTimeUTC) {
    timeText = new Date(startTimeUTC).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const leagueKey = (data.league || 'DEFAULT') as keyof typeof leagueLogos;
  const leagueLogo = leagueLogos[leagueKey] || leagueLogos.DEFAULT;

  // Style pour l'ombre des logos (identique à Cards.tsx pour un fond sombre)
  const shadowColor = 'rgba(255, 255, 255, 0.24)';
  const logoStyle = { filter: `brightness(1.1) contrast(1.2) drop-shadow(0 0 1px ${shadowColor})` } as any;

  const baseColor = '#0f172a';

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

  let gradientStyle = { backgroundColor: baseColor } as any;

  const isGradientActive = teamSelectedId && (teamSelectedId === homeTeamId || teamSelectedId === awayTeamId);

  let homeBg = baseColor;
  let awayBg = baseColor;

  if (isGradientActive) {
    const formatColor = (c: string | undefined) => {
      if (!c) return baseColor;
      return c.startsWith('#') ? c : `#${c}`;
    };
    const awayColorHex = formatColor(awayTeamColor);
    const homeColorHex = formatColor(homeTeamColor);
    gradientStyle = {
      backgroundColor: baseColor,
      backgroundImage: `linear-gradient(90deg, ${homeColorHex} 0%, ${baseColor} 10%, ${baseColor} 90%, ${awayColorHex} 100%)`,
    };
    homeBg = awayColorHex;
    awayBg = homeColorHex;
  }

  const displayHomeLogo = getBrightness(homeBg) < 128 && homeTeamLogoDark ? homeTeamLogoDark : homeTeamLogo;
  const displayAwayLogo = getBrightness(awayBg) < 128 && awayTeamLogoDark ? awayTeamLogoDark : awayTeamLogo;

  const stadiumSearch = arenaName.replace(/\s+/g, '+') + ',' + placeName.replace(/\s+/g, '+');

  return (
    <Card
      containerStyle={[styles.cardContainer, { padding: 0, backgroundColor: 'transparent' }]}
      wrapperStyle={{ padding: 0 }}
    >
      <View style={[{ padding: 15, borderRadius: 20 }, gradientStyle]}>
        {/* Header: League Logo & Live Badge */}
        <View style={styles.headerRow}>
          <View style={styles.leagueBadge}>
            <Image source={leagueLogo} style={[styles.leagueIcon, logoStyle]} resizeMode="contain" />
          </View>
          {isLive && (
            <View style={styles.liveBadge}>
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
        </View>

        {/* Main Content: Teams & Score/Time */}
        <View style={styles.mainRow}>
          {/* Home Team */}
          <View style={styles.teamColumn}>
            <Image
              source={displayHomeLogo ? { uri: displayHomeLogo } : require('../assets/images/default_logo.png')}
              style={[styles.teamLogo, logoStyle]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.teamName}>{homeTeamShort}</Text>
              {favoriteTeams.includes(homeTeamId) && (
                <Icon name="star" type="font-awesome" size={14} color="#FFD700" style={{ marginLeft: 5 }} />
              )}
            </View>
            <Text style={styles.recordText}>{homeTeamRecord || ''}</Text>
          </View>

          {/* Center: Score or VS/@ */}
          <View style={styles.centerColumn}>
            {hasScore ? (
              (favoriteTeams.includes(homeTeamId) || favoriteTeams.includes(awayTeamId)) && !scoreRevealed ? (
                <TouchableOpacity style={styles.revealButton} onPress={() => setScoreRevealed(true)}>
                  <Icon name="eye" type="font-awesome" size={30} color="#94a3b8" />
                  <Text style={styles.revealText}>{translateWord('score')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreNumber}>{homeTeamScore}</Text>

                  <Text style={styles.scoreDivider}>-</Text>
                  <Text style={styles.scoreNumber}>{awayTeamScore}</Text>
                </View>
              )
            ) : (
              <Text style={styles.vsText}>@</Text>
            )}

            <View style={styles.timeContainer}>
              <Text style={isLive ? styles.liveTimeText : styles.timeText}>{timeText}</Text>
            </View>
          </View>

          {/* Away Team */}
          <View style={styles.teamColumn}>
            <Image
              source={displayAwayLogo ? { uri: displayAwayLogo } : require('../assets/images/default_logo.png')}
              style={[styles.teamLogo, logoStyle]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.teamName}>{awayTeamShort}</Text>
              {favoriteTeams.includes(awayTeamId) && (
                <Icon name="star" type="font-awesome" size={14} color="#FFD700" style={{ marginLeft: 5 }} />
              )}
            </View>
            <Text style={styles.recordText}>{awayTeamRecord || ''}</Text>
          </View>
        </View>

        {/* Footer: Arena */}
        <View style={styles.footer}>
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
              }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Text style={styles.arenaText}>📍 {arenaName}</Text>
            </a>
          ) : (
            <Text style={styles.arenaText}>📍 {arenaName}</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0f172a', // Bleu très foncé
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
  },
  leagueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  leagueIcon: {
    height: 18,
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
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  teamName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  recordText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  centerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.2,
  },
  vsText: {
    color: '#334155',
    fontSize: 32,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  revealButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreNumber: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '700',
  },
  scoreDivider: {
    color: '#334155',
    fontSize: 24,
    marginHorizontal: 10,
  },
  timeContainer: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  liveTimeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 15,
    paddingTop: 10,
    alignItems: 'center',
  },
  arenaText: {
    color: '#64748b',
    fontSize: 12,
  },
});
