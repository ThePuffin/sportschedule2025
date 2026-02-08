import ScoreToggle from '@/components/ScoreToggle';
import Selector from '@/components/Selector';
import { LeaguesEnum } from '@/constants/Leagues';
import { TeamsEnum } from '@/constants/Teams';
import { fetchLeagues, getCache, saveCache } from '@/utils/fetchData';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openFirstTeamSelector, setOpenFirstTeamSelector] = useState(false);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOpenFirstTeamSelector(false);
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

  const handleSelection = (position: number, teamId: string | string[]) => {
    setOpenFirstTeamSelector(false);
    const id = Array.isArray(teamId) ? teamId[0] : teamId;
    const updatedTeams = [...localFavorites];

    // Ensure we have 5 slots
    while (updatedTeams.length < maxFavorites) updatedTeams.push('');

    updatedTeams[position] = id || '';

    // remove duplicates && reorganize to have not empty slots at the beginning
    const uniqueTeams = Array.from(new Set(updatedTeams.filter((team) => team !== ''))).filter((team) => !!team);

    while (uniqueTeams.length < maxFavorites) uniqueTeams.push('');
    setLocalFavorites(uniqueTeams);
  };

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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newFavorites = [...localFavorites];
    const item = newFavorites[draggedIndex];
    newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, item);
    setLocalFavorites(newFavorites);
    setDraggedIndex(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= localFavorites.length) return;
    const newFavorites = [...localFavorites];
    const item = newFavorites[index];
    newFavorites.splice(index, 1);
    newFavorites.splice(newIndex, 0, item);
    setLocalFavorites(newFavorites);
  };

  const hasFavorites = favoriteTeams.length > 0;
  const hasSelection = localFavorites.some((t) => !!t);

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => hasFavorites && onClose()}>
      <Pressable style={styles.centeredView} onPress={() => hasFavorites && onClose()}>
        <Pressable
          style={[styles.modalView, isSmallDevice && { width: '90%', maxHeight: '90%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.modalText}>{translateWord('leagueSurveilled')}:</Text>

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
                    if (!localFavorites.some((t) => !!t)) {
                      setOpenFirstTeamSelector(true);
                    }
                  }
                }}
                allowMultipleSelection={true}
                isClearable={false}
                placeholder={translateWord('filterLeagues')}
                startOpen={!hasFavorites}
                style={{ backgroundColor: 'white', borderColor: '#ccc' }}
                textStyle={{ color: '#333', fontWeight: 'normal' }}
                iconColor="#666"
              />
            </View>
          </View>

          <Text style={styles.modalText}>{translateWord('yourFav')}:</Text>
          <View style={styles.selector}>
            {Array.from({ length: Math.min(localFavorites.filter((t) => !!t).length + 1, maxFavorites) }).map(
              (_, index) => {
                const selectedId = localFavorites[index] || '';
                const filteredItems = teamsForFavorites.filter(
                  (team) =>
                    (!localFavorites.includes(team.uniqueId) || team.uniqueId === selectedId) &&
                    (localLeagues.length === 0 || localLeagues.includes(team.league)),
                );
                const isFilled = !!selectedId;
                const countFilled = localFavorites.filter((t) => !!t).length;

                return (
                  <div
                    key={selectedId || 'new-entry'}
                    draggable={!!selectedId}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    style={{ cursor: selectedId ? 'grab' : 'default' }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        zIndex: 100 - index,
                        opacity: draggedIndex === index ? 0.5 : 1,
                      }}
                    >
                      <View style={{ marginRight: 5, width: 20, alignItems: 'center' }}>
                        {isFilled &&
                          (isSmallDevice ? (
                            <View>
                              {index > 0 && (
                                <TouchableOpacity onPress={() => moveItem(index, -1)}>
                                  <Icon
                                    name="chevron-up"
                                    type="font-awesome"
                                    size={14}
                                    color="#333"
                                    style={{ marginBottom: 2 }}
                                  />
                                </TouchableOpacity>
                              )}
                              {index < countFilled - 1 && (
                                <TouchableOpacity onPress={() => moveItem(index, 1)}>
                                  <Icon
                                    name="chevron-down"
                                    type="font-awesome"
                                    size={14}
                                    color="#333"
                                    style={{ marginTop: 2 }}
                                  />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <Icon name="bars" type="font-awesome" size={14} color="#ccc" />
                          ))}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Selector
                          data={{
                            i: index,
                            items: filteredItems,
                            itemsSelectedIds: selectedId ? [selectedId] : [],
                            itemSelectedId: selectedId,
                          }}
                          onItemSelectionChange={(id) => handleSelection(index, id)}
                          allowMultipleSelection={false}
                          isClearable={true}
                          placeholder={translateWord('findTeam')}
                          startOpen={index === 0 && openFirstTeamSelector}
                          style={{ backgroundColor: 'white', borderColor: '#ccc' }}
                          textStyle={{ color: '#333', fontWeight: 'normal' }}
                          iconColor="#666"
                        />
                      </View>
                    </View>
                  </div>
                );
              },
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
            <Text style={{ marginRight: 10 }}>{translateWord('scoreView')} :</Text>
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
    backgroundColor: 'white',
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
