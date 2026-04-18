import { ThemedText } from '@/components/ThemedText';
import { GameStatus, League, leagueLogos, leagueMapping } from '@/constants/enum';
import { getGamesStatus } from '@/utils/date';
import { fetchLiveScores } from '@/utils/fetchData';
import { GameFormatted } from '@/utils/types';
import { addFavoriteTeam, generateICSFile, translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';

interface GameModalProps {
  visible: boolean;
  onClose: () => void;
  data: GameFormatted;
  gradientStyle: any;
  favoriteTeams: string[];
  showScores?: boolean;
}

export default function GameModal({
  visible,
  onClose,
  data,
  gradientStyle,
  favoriteTeams,
  showScores = true,
}: Readonly<GameModalProps>) {
  const [liveGame, setLiveGame] = useState<GameFormatted | null>(null);

  useEffect(() => {
    if (visible) {
      const fetchLiveGameData = async () => {
        const gameTime = new Date(data.startTimeUTC);
        const now = new Date();
        const hoursDiff = (now.getTime() - gameTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > -0.25 && hoursDiff < 5 && data.gameStatus !== 'FINAL' && data.gameStatus !== 'FINISHED') {
          const liveScores = await fetchLiveScores([data.uniqueId]);
          if (liveScores && liveScores.length > 0) {
            setLiveGame(liveScores[0]);
          }
        }
      };

      fetchLiveGameData();
    } else {
      setLiveGame(null);
    }
  }, [visible, data.uniqueId, data.startTimeUTC, data.gameStatus]);

  const displayData = liveGame || data;
  const {
    startTimeUTC,
    homeTeamLogo,
    awayTeamLogo,
    homeTeamLogoDark,
    awayTeamLogoDark,
    homeTeam,
    awayTeam,
    homeTeamId,
    awayTeamId,
    arenaName,
    placeName,
    homeTeamScore,
    awayTeamScore,
    homeTeamRecord,
    awayTeamRecord,
    urlLive,
    league,
    gameStatus,
    gameClock,
    gamePeriod,
  } = displayData;

  const hasScore = homeTeamScore != null && awayTeamScore != null;
  const status = getGamesStatus(displayData);
  const isToday = new Date().toDateString() === new Date(startTimeUTC).toDateString();
  const diffHours = (new Date().getTime() - new Date(startTimeUTC).getTime()) / (1000 * 60 * 60);
  const isStarted3hAgo = diffHours > 3;
  const isLive =
    status === GameStatus.IN_PROGRESS ||
    (!!gameStatus &&
      ['Top', 'Bot', 'Mid', 'End', '1st', '2nd', '3rd', '4th', 'OT', 'Half', "'", 'In SO'].some((s) =>
        gameStatus.includes(s),
      ) &&
      !gameStatus.toUpperCase().includes('FINAL') &&
      !gameStatus.toUpperCase().includes('ENDED')) ||
    (hasScore && isToday && status !== GameStatus.FINISHED && status !== GameStatus.FINAL);
  const isGameFinishedByStatus =
    gameStatus?.toUpperCase().includes('FINAL') ||
    gameStatus?.toUpperCase().includes('ENDED') ||
    status === GameStatus.FINAL ||
    status === GameStatus.FINISHED;
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
  const liveTimeText =
    gameClock && livePeriodText
      ? gameStatusAlreadyIncludesClock(livePeriodText, gameClock)
        ? livePeriodText
        : `${gameClock} - ${livePeriodText}`
      : gameClock || livePeriodText || translateWord('inProgress');
  const showLiveScoreNumbers = hasScore;
  const serviceReportsNotTerminated =
    isLive ||
    (!!gameStatus &&
      !gameStatus.toUpperCase().includes('FINAL') &&
      gameStatus.toUpperCase() !== 'FINISHED' &&
      gameStatus.toUpperCase() !== 'ENDED');
  const showFinalization = !hasScore && serviceReportsNotTerminated && isStarted3hAgo;

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const stadiumSearch = (arenaName || '').replace(/\s+/g, '+') + ',' + (placeName || '').replace(/\s+/g, '+');
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const iconColor = isDark ? 'white' : 'black';
  const buttonBackgroundColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  const displayHomeLogo =
    isDark && homeTeamLogoDark ? homeTeamLogoDark || leagueLogos.DEFAULT : homeTeamLogo || leagueLogos.DEFAULT;
  const displayAwayLogo =
    isDark && awayTeamLogoDark ? awayTeamLogoDark || leagueLogos.DEFAULT : awayTeamLogo || leagueLogos.DEFAULT;

  const getEspnStandingsUrl = (leagueKey: string) => {
    const baseUrl = 'https://www.espn.com';

    const path = leagueMapping[leagueKey.toUpperCase() as keyof typeof leagueMapping];

    if (!path) return null;

    return `${baseUrl}/${path}`;
  };

  const standingUrl = league === League.PWHL ? 'https://www.thepwhl.com/stats/standings' : getEspnStandingsUrl(league);

  const renderStatusText = () => {
    if (isLive) {
      if ((!gameClock || gameClock === '00:00') && gameStatus && gameStatus !== 'IN_PROGRESS') {
        return (
          <ThemedText style={[styles.dateText, { color: '#ef4444', fontWeight: 'bold' }]}>{gameStatus}</ThemedText>
        );
      }

      return (
        <ThemedText style={[styles.dateText, { color: '#ef4444', fontWeight: 'bold' }]}>{liveTimeText}</ThemedText>
      );
    }

    if (showFinalization) {
      return (
        <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.dateText}>
          {translateWord('final')}
        </ThemedText>
      );
    }

    if (hasScore) {
      if (status === GameStatus.FINAL || status === GameStatus.FINISHED) {
        return (
          <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.dateText}>
            {translateWord('score')}
          </ThemedText>
        );
      }

      const statusText = status === GameStatus.FINAL ? translateWord('final') : translateWord('ended');
      return (
        <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.dateText}>
          {statusText}
        </ThemedText>
      );
    }

    return (
      <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.dateText}>
        {startTimeUTC ? new Date(startTimeUTC).toLocaleDateString(undefined, dateOptions) : ''}
      </ThemedText>
    );
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable style={[styles.modalView, gradientStyle]} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" type="font-awesome" size={20} color={iconColor} />
          </TouchableOpacity>

          <View style={styles.modalContent}>
            <View style={styles.teamsContainer}>
              <View style={styles.teamColumn}>
                {displayAwayLogo && (
                  <Image source={{ uri: displayAwayLogo }} style={styles.logo} resizeMode="contain" />
                )}
                <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.modalTeamName}>
                  {awayTeam ? awayTeam.replace(/ (?=[^ ]*$)/, '\n') : ''}
                  <Icon
                    onPress={() => addFavoriteTeam(favoriteTeams, awayTeamId)}
                    name={favoriteTeams.includes(awayTeamId) ? 'star' : 'star-o'}
                    type="font-awesome"
                    size={14}
                    color={favoriteTeams.includes(awayTeamId) ? '#FFD700' : '#94a3b8'}
                    style={{ marginLeft: 5 }}
                  />
                </ThemedText>
                {awayTeamRecord && (
                  <ThemedText lightColor="#475569" darkColor="#94a3b8" style={styles.recordText}>
                    {awayTeamRecord}
                  </ThemedText>
                )}
              </View>

              {showLiveScoreNumbers ? (
                <View style={styles.scoreContainer}>
                  <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.scoreText}>
                    {awayTeamScore}
                  </ThemedText>
                  <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.scoreDivider}>
                    -
                  </ThemedText>
                  <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.scoreText}>
                    {homeTeamScore}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.modalVsText}>
                  @
                </ThemedText>
              )}

              <View style={styles.teamColumn}>
                {displayHomeLogo && (
                  <Image source={{ uri: displayHomeLogo }} style={styles.logo} resizeMode="contain" />
                )}
                <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.modalTeamName}>
                  {homeTeam ? homeTeam.replace(/ (?=[^ ]*$)/, '\n') : ''}
                  <Icon
                    onPress={() => addFavoriteTeam(favoriteTeams, homeTeamId)}
                    name={favoriteTeams.includes(homeTeamId) ? 'star' : 'star-o'}
                    type="font-awesome"
                    size={14}
                    color={favoriteTeams.includes(homeTeamId) ? '#FFD700' : '#94a3b8'}
                    style={{ marginLeft: 5 }}
                  />
                </ThemedText>
                {homeTeamRecord && (
                  <ThemedText lightColor="#475569" darkColor="#94a3b8" style={styles.recordText}>
                    {homeTeamRecord}
                  </ThemedText>
                )}
              </View>
            </View>
            {renderStatusText()}

            <View style={styles.actionsRow}>
              {isLive || hasScore ? (
                <>
                  <a
                    href={urlLive}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      flex: 1,
                      justifyContent: 'center',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <View style={[styles.actionButton, { backgroundColor: buttonBackgroundColor, width: '100%' }]}>
                      <Icon
                        name="list-alt"
                        type="font-awesome"
                        size={20}
                        color={iconColor}
                        style={{ marginRight: 10 }}
                      />
                      <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.actionButtonText}>
                        {translateWord('gameDetails')}
                      </ThemedText>
                    </View>
                  </a>
                  {standingUrl && (
                    <a
                      href={standingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <View style={[styles.actionButton, { backgroundColor: buttonBackgroundColor, width: '100%' }]}>
                        <Icon
                          name="list-ol"
                          type="font-awesome"
                          size={20}
                          color={iconColor}
                          style={{ marginRight: 10 }}
                        />
                        <ThemedText lightColor="#0f172a" darkColor="#ffffff" style={styles.actionButtonText}>
                          {translateWord('standings')}
                        </ThemedText>
                      </View>
                    </a>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: buttonBackgroundColor }]}
                      onPress={() => {
                        generateICSFile(data);
                        onClose();
                      }}
                    >
                      <Icon
                        name="calendar-plus-o"
                        type="font-awesome"
                        size={18}
                        color={iconColor}
                        style={styles.buttonIcon}
                      />
                      <ThemedText style={styles.actionButtonText}>{translateWord('downloadICS')}</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {arenaName && (
                    <View style={styles.buttonWrapper}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${stadiumSearch}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <View style={[styles.actionButton, { backgroundColor: buttonBackgroundColor }]}>
                          <Icon
                            name="map-marker"
                            type="font-awesome"
                            size={18}
                            color={iconColor}
                            style={styles.buttonIcon}
                          />
                          <ThemedText style={styles.actionButtonText}>{translateWord('localizeArena')}</ThemedText>
                        </View>
                      </a>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 500,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  modalContent: {
    alignItems: 'center',
    width: '100%',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  modalTeamName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recordText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  modalTeamFullName: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
  },
  modalVsText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    flex: 1,
    maxWidth: 200,
    minWidth: 120,
  },
  actionButton: {
    flexDirection: 'row',
    height: 54,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    flexShrink: 1,
  },
  dateText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
