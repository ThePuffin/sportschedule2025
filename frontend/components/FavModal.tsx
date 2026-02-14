import ScoreToggle from '@/components/ScoreToggle';
import Selector from '@/components/Selector';
import TeamReorderSelector from '@/components/TeamReorderSelector';
import { LeaguesEnum } from '@/constants/Leagues';
import { TeamsEnum } from '@/constants/Teams';
import { useThemeColor } from '@/hooks/useThemeColor';
import { fetchLeagues, getCache, saveCache } from '@/utils/fetchData';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const maxFavorites = 5;

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
  const [isSmallDevice, setIsSmallDevice] = useState(Dimensions.get('window').width < 768);
  const [localFavorites, setLocalFavorites] = useState<string[]>(favoriteTeams);
  const [localLeagues, setLocalLeagues] = useState<string[]>([]);
  const [allLeagues, setAllLeagues] = useState<string[]>(() => {
    const cached = getCache<string[]>('allLeagues');
    return cached && cached.length > 0 ? cached : Object.values(LeaguesEnum);
  });
  const [showScores, setShowScores] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#000' }, 'background');
  const borderColor = useThemeColor({}, 'text');
  const itemBackgroundColor = useThemeColor({ light: '#f0f0f0', dark: '#2c2c2e' }, 'background');

  useEffect(() => {
    if (isOpen) {
      const cached = getCache<string[]>('favoriteTeams');
      setLocalFavorites(cached || favoriteTeams);

      const cachedShowScores = getCache<boolean>('showScores');
      setShowScores(cachedShowScores ?? false);

      const cachedLeagues = getCache<string[]>('leaguesSelected');
      if (cachedLeagues && cachedLeagues.length > 0) {
        setLocalLeagues(cachedLeagues);
      } else {
        setLocalLeagues(Object.values(LeaguesEnum));
      }

      fetchLeagues((leagues: string[]) => {
        const filtered = leagues.filter((l) => l !== 'ALL');
        setAllLeagues(filtered);
        saveCache('allLeagues', filtered);
        const cachedLeagues = getCache<string[]>('leaguesSelected');
        // Si pas de cache, on sélectionne tout par défaut
        setLocalLeagues(cachedLeagues && cachedLeagues.length > 0 ? cachedLeagues : filtered);
      });
    }
  }, [isOpen]);

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

  const handleSave = () => {
    onSave(localFavorites);
    saveCache('leaguesSelected', localLeagues);
    saveCache('showScores', showScores);
    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
      globalThis.window.dispatchEvent(new Event('leaguesUpdated'));
      globalThis.window.dispatchEvent(new Event('scoresUpdated'));
    }
    onClose();
  };

  const hasFavorites = favoriteTeams.length > 0;
  const hasSelection = localFavorites.some((t) => !!t);

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => hasFavorites && onClose()}>
      <Pressable style={styles.centeredView} onPress={() => hasFavorites && onClose()}>
        <Pressable
          style={[styles.modalView, { backgroundColor }, isSmallDevice && { width: '90%', maxHeight: '90%' }]}
          onPress={(e) => e.stopPropagation()}
        >
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
                  if (newIds.length > 0) {
                    setLocalLeagues(newIds);
                  }
                }}
                allowMultipleSelection={true}
                isClearable={false}
                placeholder={translateWord('filterLeagues')}
                startOpen={!hasFavorites}
                style={{ backgroundColor, borderColor }}
                textStyle={{ color: textColor, fontWeight: 'normal' }}
                iconColor={textColor}
              />
            </View>
          </View>

          <Text style={[styles.modalText, { color: textColor }]}>{translateWord('yourFav')}:</Text>
          <View style={styles.selector}>
            <TeamReorderSelector
              teams={localFavorites}
              allTeams={teamsForFavorites}
              maxTeams={maxFavorites}
              onChange={setLocalFavorites}
              allowedLeagues={localLeagues}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
            <Text style={{ marginRight: 10, color: textColor }}>{translateWord('scoreView')} :</Text>
            <ScoreToggle value={showScores} onValueChange={setShowScores} />
          </View>

          <View style={styles.buttonsContainer}>
            {hasFavorites && (
              <Pressable style={[styles.button, styles.buttonClose, styles.buttonCancel]} onPress={onClose}>
                <Text style={[styles.textStyle, styles.textStyleCancel]}>{translateWord('cancel')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.buttonClose, !hasSelection && { opacity: 0.5 }]}
              onPress={() => hasSelection && handleSave()}
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
