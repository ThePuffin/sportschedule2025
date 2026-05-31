import ScoreToggle from '@/components/ScoreToggle';
import Selector from '@/components/Selector';
import TeamReorderSelector from '@/components/TeamReorderSelector';
import { LeaguesEnum } from '@/constants/Leagues';
import { TeamsEnum } from '@/constants/Teams';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchLeagues, getCache, saveCache } from '@/utils/fetchData';
import { db } from '@/utils/firebaseConfig';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { maxFavoritesNumber } from '../constants/Constants';

const FavModal = ({
  isOpen,
  favoriteTeams,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  favoriteTeams: string[];
  onClose: () => void;
  onSave: (teams: string[]) => void;
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isSmallDevice, setIsSmallDevice] = useState(Dimensions.get('window').width < 768);
  const [localFavorites, setLocalFavorites] = useState<string[]>(favoriteTeams);
  const [localLeagues, setLocalLeagues] = useState<string[]>(() => {
    const cached = getCache<string[]>('leaguesSelected');
    return cached && cached.length > 0 ? cached : Object.values(LeaguesEnum);
  });
  const [allLeagues, setAllLeagues] = useState<string[]>(() => {
    const cached = getCache<string[]>('allLeagues');
    return cached && cached.length > 0 ? cached : Object.values(LeaguesEnum);
  });
  const [showScores, setShowScores] = useState(false);
  const hasFavorites = favoriteTeams.length > 0;
  const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false);
  const [forceOpenTeamSelector, setForceOpenTeamSelector] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#000' }, 'background');
  const borderColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (isOpen) {
      const cached = getCache<string[]>('favoriteTeams');
      const currentFavorites = cached || favoriteTeams;
      setLocalFavorites(currentFavorites);
      setForceOpenTeamSelector(false);

      const cachedShowScores = getCache<boolean>('showScores');
      setShowScores(cachedShowScores ?? false);

      fetchLeagues((leagues: string[]) => {
        const filtered = leagues.filter((l) => l !== 'ALL');
        setAllLeagues(filtered);
        saveCache('allLeagues', filtered);
        const cachedLeagues = getCache<string[]>('leaguesSelected');
        // If no cache, select all by default
        setLocalLeagues(cachedLeagues && cachedLeagues.length > 0 ? cachedLeagues : filtered);
      });
    }
  }, [isOpen, favoriteTeams]);

  useEffect(() => {
    const onChange = () => {
      setIsSmallDevice(Dimensions.get('window').width < 768);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  const teamsForFavorites: Team[] = Object.entries(TeamsEnum).map(([id, name]) => ({
    label: name,
    uniqueId: id,
    value: id,
    league: id.split('-')[0],
    id: '',
    teamLogo: '',
    teamCommonName: name,
    conferenceName: '',
    divisionName: '',
    abbrev: '',
    updateDate: '',
  }));

  const handleSave = async () => {
    if (!hasSelection) {
      setForceOpenTeamSelector(true);
      return;
    }

    const filteredFavorites = localFavorites.filter((team) => team !== '' && localLeagues.includes(team.split('-')[0]));
    onSave(filteredFavorites);
    saveCache('leaguesSelected', localLeagues);
    saveCache('showScores', showScores);

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            favoriteTeams: filteredFavorites,
            leaguesSelected: localLeagues,
            showScores: showScores,
            lastUpdate: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error: unknown) {
        console.error('Error syncing user preferences to Firestore:', error);
      }
    }

    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
      globalThis.window.dispatchEvent(new Event('leaguesUpdated'));
      globalThis.window.dispatchEvent(new Event('scoresUpdated'));
    }
    onClose();
  };

  const handleSelectorOpen = useCallback(() => setIsLeagueSelectorOpen(true), []);
  const handleSelectorClose = useCallback(() => setIsLeagueSelectorOpen(false), []);

  // Check if at least one team is currently selected in the modal
  const hasSelection = localFavorites.some((t) => t && t !== '');

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      // Prevent closing via hardware back button if no favorites exist yet
      onRequestClose={() => hasFavorites && onClose()}
    >
      <Pressable
        style={styles.centeredView}
        // Prevent closing via backdrop click if no favorites exist yet
        onPress={() => hasFavorites && onClose()}
      >
        <Pressable
          style={[styles.modalView, { backgroundColor }, isSmallDevice && { width: '90%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {!user && (
              <View style={{ alignItems: 'center', marginBottom: 20, width: '100%' }}>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push('/connection');
                  }}
                  style={{
                    backgroundColor: '#007AFF',
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 20,
                    width: '100%',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{translateWord('signIn')}</Text>
                </TouchableOpacity>
                <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.6, fontStyle: 'italic', color: textColor }}>
                  — {translateWord('or')} —
                </Text>
              </View>
            )}

            <Text style={[styles.modalText, { color: textColor }]}>{translateWord('leagueSurveilled')}:</Text>

            <View style={{ marginBottom: 15, zIndex: 20, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ marginRight: 5, width: 20 }} />
              <View style={{ flex: 1 }}>
                <Selector
                  key={`league-selector-${isOpen}`}
                  data={{
                    i: 999,
                    items: allLeagues,
                    itemsSelectedIds: localLeagues,
                    itemSelectedId: '',
                  }}
                  onItemSelectionChange={(ids) => {
                    const newIds = Array.isArray(ids) ? ids : [];
                    setLocalLeagues(newIds);
                  }}
                  allowMultipleSelection={true}
                  isClearable={false}
                  placeholder={translateWord('filterLeagues')}
                  startOpen={false}
                  style={{ backgroundColor, borderColor }}
                  textStyle={{ color: textColor, fontWeight: 'normal' }}
                  iconColor={textColor}
                  onOpen={handleSelectorOpen}
                  onClose={handleSelectorClose}
                />
              </View>
            </View>

            {!isLeagueSelectorOpen && (
              <>
                <Text style={[styles.modalText, { color: textColor }]}>{translateWord('yourFav')}:</Text>
                <View style={styles.selector}>
                  <TeamReorderSelector
                    teams={localFavorites}
                    allTeams={teamsForFavorites}
                    maxTeams={maxFavoritesNumber}
                    onChange={setLocalFavorites}
                    allowedLeagues={localLeagues}
                    forceOpenFirstSelector={forceOpenTeamSelector}
                    onFirstSelectorClose={() => setForceOpenTeamSelector(false)}
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 15,
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ marginRight: 10, color: textColor }}>{translateWord('scoreView')} :</Text>
                  <ScoreToggle value={showScores} onValueChange={setShowScores} />
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.buttonsContainer}>
            {/* Only show Cancel if the user already has saved favorites to fall back on */}
            {hasFavorites && favoriteTeams.length > 0 && (
              <Pressable style={[styles.button, styles.buttonClose, styles.buttonCancel]} onPress={onClose}>
                <Text style={[styles.textStyle, styles.textStyleCancel]}>{translateWord('cancel')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.buttonClose, localLeagues.length === 0 && { opacity: 0.5 }]}
              onPress={() => localLeagues.length > 0 && handleSave()}
            >
              <Text style={styles.textStyle}>{translateWord('register')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
      web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.25)' },
    }),
    width: '50%',
    maxHeight: '90%',
    minHeight: 300,
    justifyContent: 'space-between',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 20,
    flex: 1,
  },
  buttonOpen: {
    backgroundColor: '#fff',
  },
  buttonClose: {
    backgroundColor: '#000',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'white',
  },
  buttonCancel: {
    backgroundColor: 'white',
    borderColor: 'black',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textStyleCancel: {
    color: 'black',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  selector: {
    zIndex: 10,
  },
});

export default FavModal;
