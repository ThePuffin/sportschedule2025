import Selector from '@/components/Selector';
import { TeamsEnum } from '@/constants/Teams';
import { getCache } from '@/utils/fetchData';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

  useEffect(() => {
    if (isOpen) {
      const cached = getCache<string[]>('favoriteTeams');
      setLocalFavorites(cached || favoriteTeams);
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
    if (globalThis.window !== undefined) {
      globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
    }
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable style={[styles.modalView, isSmallDevice && { width: '90%' }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalText}>{translateWord('yourFav')}:</Text>

          <View style={styles.selector}>
            {Array.from({ length: Math.min(localFavorites.filter((t) => !!t).length + 1, maxFavorites) }).map(
              (_, index) => {
                const selectedId = localFavorites[index] || '';
                const filteredItems = teamsForFavorites.filter(
                  (team) => !localFavorites.includes(team.uniqueId) || team.uniqueId === selectedId
                );
                return (
                  <Selector
                    key={selectedId || 'new-entry'}
                    data={{
                      i: index,
                      items: filteredItems,
                      itemsSelectedIds: selectedId ? [selectedId] : [],
                      itemSelectedId: selectedId,
                    }}
                    onItemSelectionChange={(id) => handleSelection(index, id)}
                    allowMultipleSelection={false}
                    isClearable={true}
                  />
                );
              }
            )}
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable style={[styles.button, styles.buttonClose]} onPress={handleSave}>
              <Text style={styles.textStyle}>{translateWord('register')}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonClose, styles.buttonCancel]} onPress={onClose}>
              <Text style={styles.textStyle}>{translateWord('cancel')}</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  },
  buttonCancel: {
    backgroundColor: '#6c757d',
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
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  selector: {
    zIndex: 10,
  },
});

export default FavModal;
