import { ThemedText } from '@/components/ThemedText';
import { GameFormatted } from '@/utils/types';
import { generateICSFile, translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React from 'react';
import { Image, Modal, Pressable, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';

interface GameModalProps {
  visible: boolean;
  onClose: () => void;
  data: GameFormatted;
  gradientStyle: any;
}

export default function GameModal({ visible, onClose, data, gradientStyle }: GameModalProps) {
  const {
    startTimeUTC,
    homeTeamLogo,
    awayTeamLogo,
    homeTeamLogoDark,
    awayTeamLogoDark,
    homeTeam,
    awayTeam,
    arenaName,
    placeName,
    homeTeamScore,
    awayTeamScore,
    homeTeamRecord,
    awayTeamRecord,
    urlLive,
  } = data;

  const hasScore = homeTeamScore != null && awayTeamScore != null;

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

  const displayHomeLogo = isDark && homeTeamLogoDark ? homeTeamLogoDark : homeTeamLogo;
  const displayAwayLogo = isDark && awayTeamLogoDark ? awayTeamLogoDark : awayTeamLogo;

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
                </ThemedText>
                {awayTeamRecord && (
                  <ThemedText lightColor="#475569" darkColor="#94a3b8" style={styles.recordText}>
                    {awayTeamRecord}
                  </ThemedText>
                )}
              </View>

              {hasScore ? (
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
                </ThemedText>
                {homeTeamRecord && (
                  <ThemedText lightColor="#475569" darkColor="#94a3b8" style={styles.recordText}>
                    {homeTeamRecord}
                  </ThemedText>
                )}
              </View>
            </View>
            {!hasScore ? (
              <>
                <ThemedText lightColor="#475569" darkColor="#CBD5E1" style={styles.dateText}>
                  {startTimeUTC ? new Date(startTimeUTC).toLocaleDateString(undefined, dateOptions) : ''}
                </ThemedText>

                <View style={styles.actionsRow}>
                  {/* Premier bouton (ICS) */}
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

                  {/* Deuxième bouton (Arena) */}
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
                </View>
              </>
            ) : (
              urlLive && (
                <View style={styles.actionsRow}>
                  <a
                    href={urlLive}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      width: '100%',
                      maxWidth: 250,
                      justifyContent: 'center',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <View style={[styles.actionButton, { backgroundColor: buttonBackgroundColor, width: '100%' }]}>
                      <Icon
                        name="info-circle"
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
                </View>
              )
            )}
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
    justifyContent: 'center', // Centrage si un seul bouton
    alignItems: 'center',
  },
  buttonWrapper: {
    flex: 1, // Chaque wrapper prend la même largeur
    maxWidth: 200, // Empêche les boutons de devenir trop larges sur grand écran
    minWidth: 120, // Taille minimum pour la lisibilité
  },
  actionButton: {
    flexDirection: 'row',
    height: 54, // Hauteur fixe identique pour tous
    width: '100%', // Prend toute la place du wrapper (donc largeur identique)
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
    flexShrink: 1, // Force le texte à passer à la ligne si trop long au lieu de pousser le bouton
  },
  dateText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
