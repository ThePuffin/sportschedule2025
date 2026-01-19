import { leagueLogos } from '@/constants/enum';
import { getCache } from '@/utils/fetchData';
import { CardsProps } from '@/utils/types';
import { Card } from '@rneui/base';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

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
    color,
    arenaName = '',
    startTimeUTC,
    teamSelectedId,
    homeTeamId,
    awayTeamId,
    homeTeamRecord,
    awayTeamRecord,
    status, // Supposons que vous ayez un status pour le mode LIVE
    placeName = '',
    gameDate: gameDateStr,
  } = data;

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

  const hasScore = homeTeamScore != null && awayTeamScore != null;
  const isLive = status === 'LIVE'; // À adapter selon vos données

  const timeText = startTimeUTC
    ? new Date(startTimeUTC).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';

  const leagueKey = (data.league || 'DEFAULT') as keyof typeof leagueLogos;
  const leagueLogo = leagueLogos[leagueKey] || leagueLogos.DEFAULT;

  // Style pour l'ombre des logos (identique à Cards.tsx pour un fond sombre)
  const shadowColor = 'rgba(255, 255, 255, 0.5)';
  const logoStyle = { filter: `brightness(1.1) contrast(1.2) drop-shadow(0 0 2px ${shadowColor})` } as any;

  const baseColor = '#0f172a';
  const teamColor = color ? (color.startsWith('#') ? color : `#${color}`) : baseColor;

  const getBrightness = (hexColor: string) => {
    if (!hexColor) return 0;
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  let gradientStyle = { backgroundColor: baseColor } as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let isPast = false;
  if (gameDateStr) {
    const datePart = gameDateStr.includes('T') ? gameDateStr.split('T')[0] : gameDateStr;
    const [y, m, d] = datePart.split('-').map(Number);
    const gameDateLocal = new Date(y, m - 1, d);
    isPast = !isNaN(gameDateLocal.getTime()) && gameDateLocal < today;
  } else if (startTimeUTC) {
    const gameDate = new Date(startTimeUTC);
    isPast = !isNaN(gameDate.getTime()) && gameDate < today;
  }

  const isGradientActive =
    !isPast && teamSelectedId && (teamSelectedId === homeTeamId || teamSelectedId === awayTeamId);

  if (isGradientActive) {
    let gradientColors = [baseColor, baseColor];
    let stops = ['0%', '100%'];

    if (teamSelectedId === awayTeamId) {
      gradientColors = [baseColor, teamColor];
      stops = ['67%', '100%'];
    } else if (teamSelectedId === homeTeamId) {
      gradientColors = [teamColor, baseColor];
      stops = ['0%', '33%'];
    }
    gradientStyle = {
      backgroundColor: gradientColors[0],
      backgroundImage: `linear-gradient(90deg, ${gradientColors[0]} ${stops[0]}, ${gradientColors[1]} ${stops[1]})`,
    };
  }

  const homeBg = isGradientActive && teamSelectedId === homeTeamId ? teamColor : baseColor;
  const awayBg = isGradientActive && teamSelectedId === awayTeamId ? teamColor : baseColor;

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
              <Text style={styles.liveText}>✦ LIVE</Text>
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
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{homeTeamScore}</Text>

                <Text style={styles.scoreDivider}>-</Text>
                <Text style={styles.scoreNumber}>{awayTeamScore}</Text>
              </View>
            ) : (
              <Text style={styles.vsText}>@</Text>
            )}

            <View style={styles.timeContainer}>
              <Text style={isLive ? styles.liveTimeText : styles.timeText}>{isLive ? 'Q2 - 2:08' : timeText}</Text>
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
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leagueIcon: {
    width: 30,
    height: 15,
  },
  liveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
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
