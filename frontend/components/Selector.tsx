import { emoticonEnum, leagueLogos } from '@/constants/enum';
import { getCache } from '@/utils/fetchData';
import { SelectorProps } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Selector({
  data,
  onItemSelectionChange,
  allowMultipleSelection = false,
  isClearable = false,
  placeholder,
  startOpen = false,
}: Readonly<SelectorProps & { placeholder?: string; startOpen?: boolean }>) {
  const { items, i, itemSelectedId } = data;
  let { itemsSelectedIds = [] } = data;

  const [visible, setVisible] = useState(startOpen);
  const [search, setSearch] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [tempSelectedId, setTempSelectedId] = useState<string>('');
  const inputRef = useRef<TextInput>(null);
  const userClearedRef = useRef(false);

  useEffect(() => {
    const loadFavs = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams')?.filter((t) => t !== '') || []);
    };
    loadFavs();
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', loadFavs);
      return () => globalThis.window.removeEventListener('favoritesUpdated', loadFavs);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTempSelectedIds(itemsSelectedIds || []);
      setTempSelectedId(itemSelectedId || '');
    }
  }, [visible, itemsSelectedIds, itemSelectedId]);

  const getOptions = () => {
    if (!items) return [];
    return items
      .filter((item) => !!item)
      .map((item) => {
        const id = typeof item === 'string' ? item : item.uniqueId;
        const labelRaw = typeof item === 'string' ? item : item.label;
        const league = typeof item === 'string' ? item : item.league || item.value;

        const label = labelRaw === 'All' ? translateWord('all') : labelRaw;

        return {
          id,
          label,
          league,
          original: item,
          isFav: favoriteTeams.includes(id),
        };
      })
      .sort((a, b) => {
        if (a.isFav && !b.isFav) return -1;
        if (!a.isFav && b.isFav) return 1;
        return 0;
      });
  };

  const allOptions = getOptions();
  const uniqueLeagues = Array.from(
    new Set(allOptions.map((o) => o.league).filter((l) => !!l && typeof l === 'string'))
  );

  useEffect(() => {
    if (allOptions.length === 0 || itemSelectedId === 'ALL') return;

    const validIds = new Set(allOptions.map((o) => o.id));

    if (allowMultipleSelection) {
      const currentIds = itemsSelectedIds || [];
      const validSelection = currentIds.filter((id) => validIds.has(id));
      if (validSelection.length !== currentIds.length) {
        onItemSelectionChange(validSelection, i);
      }
    } else {
      if (!itemSelectedId) {
        if (userClearedRef.current) return;
        const allOption = allOptions.find((o) => o.id === 'all' || o.id === 'ALL');
        if (allOption) {
          onItemSelectionChange(allOption.id, i);
        }
      } else {
        userClearedRef.current = false;
        if (!validIds.has(itemSelectedId)) {
          onItemSelectionChange('', i);
        }
      }
    }
  }, [allOptions, allowMultipleSelection, itemsSelectedIds, itemSelectedId, i, onItemSelectionChange]);

  const filteredOptions = allOptions.filter((opt) => {
    const matchesSearch = opt.label.toLowerCase().includes(search.toLowerCase());
    const matchesLeague = selectedLeague ? opt.league === selectedLeague : true;
    return matchesSearch && matchesLeague;
  });

  const isAllSelected = allOptions.length > 0 && allOptions.every((o) => tempSelectedIds.includes(o.id));

  const listData = allowMultipleSelection
    ? [
        {
          id: 'SELECT_ALL',
          label: isAllSelected ? translateWord('nothing').toUpperCase() : translateWord('all').toUpperCase(),
          isFav: false,
          original: null,
          league: '',
        },
        ...filteredOptions,
      ]
    : isClearable
    ? [
        { id: 'NOTHING', label: translateWord('all').toUpperCase(), isFav: false, original: null, league: '' },
        ...filteredOptions,
      ]
    : filteredOptions;

  const handleSelect = (id: string) => {
    if (allowMultipleSelection) {
      if (id === 'SELECT_ALL') {
        const allIds = allOptions.map((o) => o.id);
        const isAllSelected = allOptions.every((o) => tempSelectedIds.includes(o.id));
        setTempSelectedIds(isAllSelected ? [] : allIds);
      } else {
        const newSelection = tempSelectedIds.includes(id)
          ? tempSelectedIds.filter((sid) => sid !== id)
          : [...tempSelectedIds, id];
        setTempSelectedIds(newSelection);
      }
    } else {
      if (id === 'NOTHING') {
        setTempSelectedId('');
      } else if (isClearable && id === tempSelectedId) {
        setTempSelectedId('');
      } else {
        setTempSelectedId(id);
      }
    }
  };

  const handleValidate = () => {
    if (allowMultipleSelection) {
      if (tempSelectedIds.length === 0) userClearedRef.current = true;
      onItemSelectionChange(tempSelectedIds, i);
    } else {
      if (!tempSelectedId) userClearedRef.current = true;
      onItemSelectionChange(tempSelectedId, i);
    }
    setVisible(false);
  };

  const handleClear = () => {
    userClearedRef.current = true;
    if (allowMultipleSelection) {
      onItemSelectionChange([], i);
    } else {
      onItemSelectionChange('', i);
    }
  };

  const getDisplayText = () => {
    if (allowMultipleSelection) {
      if (!itemsSelectedIds || itemsSelectedIds.length === 0) return placeholder || translateWord('Filter');
      if (itemsSelectedIds.length === allOptions.length && allOptions.length > 0) return translateWord('all');

      const selectedLabels = allOptions.filter((o) => itemsSelectedIds.includes(o.id)).map((o) => o.label);

      if (selectedLabels.length === 0) return translateWord('Filter');

      if (selectedLabels.length <= 2) return selectedLabels.join(', ');
      return `${selectedLabels.slice(0, 2).join(', ')} (+${selectedLabels.length - 2})`;
    } else {
      const selected = allOptions.find((o) => o.id === itemSelectedId);
      return selected ? selected.label : placeholder || translateWord('Filter');
    }
  };

  const hasSelection = allowMultipleSelection ? itemsSelectedIds.length > 0 : !!itemSelectedId;

  const isDisabled =
    !items ||
    items.length === 0 ||
    (allOptions.length === 1 &&
      (allowMultipleSelection ? itemsSelectedIds.includes(allOptions[0].id) : itemSelectedId === allOptions[0].id));

  const renderTrigger = () => {
    let logo = null;
    if (!allowMultipleSelection && itemSelectedId) {
      const selectedItem = allOptions.find((o) => o.id === itemSelectedId);
      if (selectedItem) {
        logo = (selectedItem.original as any)?.logo || (selectedItem.original as any)?.teamLogo;
        if (!logo) {
          if (leagueLogos[selectedItem.id]) logo = leagueLogos[selectedItem.id];
          else if (selectedItem.league && leagueLogos[selectedItem.league]) logo = leagueLogos[selectedItem.league];
        }
      }
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 25 }}>
        {logo && (
          <Image
            source={typeof logo === 'string' ? { uri: logo } : logo}
            style={{ width: 25, height: 25, resizeMode: 'contain', marginRight: 10, opacity: isDisabled ? 0.5 : 1 }}
          />
        )}
        <Text style={[styles.selectorText, (!hasSelection || isDisabled) && { color: '#999' }]} numberOfLines={1}>
          {getDisplayText()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selectorButton, isDisabled && styles.selectorButtonDisabled]}
        onPress={() => setVisible(true)}
        disabled={isDisabled}
      >
        {renderTrigger()}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isClearable && hasSelection && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{ marginRight: 10 }}
            >
              <Icon name="times-circle" type="font-awesome" size={16} color="#999" />
            </TouchableOpacity>
          )}
          <Icon name="chevron-down" type="font-awesome" size={12} color="#666" />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {allowMultipleSelection ? translateWord('selectMultiple') : translateWord('select') || ''}
                </Text>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Icon name="times" type="font-awesome" size={20} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Recherche */}
              {allOptions.length > 10 && (
                <View style={styles.searchContainer}>
                  <Icon name="search" type="font-awesome" size={14} color="#999" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    placeholder={placeholder || translateWord('Filter')}
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#999"
                    autoFocus={true}
                  />
                </View>
              )}

              {/* Filtre par ligue */}
              {uniqueLeagues.length > 1 && uniqueLeagues.length < allOptions.length && (
                <View style={styles.leagueFilterContainer}>
                  {(() => {
                    const filters = [null, ...uniqueLeagues];
                    const maxPerLine = 5;
                    const numLines = Math.ceil(filters.length / maxPerLine);
                    const itemsPerLine = Math.max(1, Math.ceil(filters.length / numLines));
                    const rows = [];
                    for (let i = 0; i < filters.length; i += itemsPerLine) {
                      rows.push(filters.slice(i, i + itemsPerLine));
                    }
                    return rows.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.leagueRow}>
                        {row.map((league) => (
                          <TouchableOpacity
                            key={league || 'FILTER_ALL'}
                            style={[styles.leagueChip, selectedLeague === league && styles.leagueChipSelected]}
                            onPress={() => setSelectedLeague(league === selectedLeague ? null : league)}
                          >
                            <Text
                              style={[
                                styles.leagueChipText,
                                selectedLeague === league && styles.leagueChipTextSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {league === null ? translateWord('all') || 'All' : league}
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {Array.from({ length: itemsPerLine - row.length }).map((_, i) => (
                          <View key={`placeholder-${i}`} style={[styles.leagueChip, { opacity: 0, borderWidth: 0 }]} />
                        ))}
                      </View>
                    ));
                  })()}
                </View>
              )}

              {/* Liste des options */}
              <FlatList
                data={listData}
                keyExtractor={(item) => item.id}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => {
                  const isSelected = allowMultipleSelection
                    ? item.id === 'SELECT_ALL'
                      ? isAllSelected
                      : tempSelectedIds.includes(item.id)
                    : item.id === 'NOTHING'
                    ? !tempSelectedId
                    : tempSelectedId === item.id;

                  let logo = (item.original as any)?.logo || (item.original as any)?.teamLogo;
                  if (!logo) {
                    if (leagueLogos[item.id]) logo = leagueLogos[item.id];
                    else if (item.league && leagueLogos[item.league]) logo = leagueLogos[item.league];
                  }

                  const showSeparator = index > 0 && listData[index - 1].isFav && !item.isFav;

                  return (
                    <View>
                      {showSeparator && <View style={styles.separator} />}
                      <TouchableOpacity
                        style={[styles.optionItem, isSelected && styles.optionSelected]}
                        onPress={() => handleSelect(item.id)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          {logo && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {item.isFav && (
                                <Icon
                                  name="star"
                                  type="font-awesome"
                                  size={12}
                                  color="#FFD700"
                                  style={{ marginRight: 5 }}
                                />
                              )}
                              <Image
                                source={typeof logo === 'string' ? { uri: logo } : logo}
                                style={{ width: 30, height: 30, resizeMode: 'contain', marginRight: 10 }}
                              />
                            </View>
                          )}
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</Text>
                        </View>
                        {isSelected &&
                          (item.league && emoticonEnum[item.league as keyof typeof emoticonEnum] ? (
                            <Text style={{ fontSize: 16 }}>
                              {emoticonEnum[item.league as keyof typeof emoticonEnum]}
                            </Text>
                          ) : (
                            <Icon name="check" type="font-awesome" size={14} color={isSelected ? 'white' : 'black'} />
                          ))}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />

              {/* Boutons Valider / Annuler */}
              <View style={styles.buttonsContainer}>
                <Pressable
                  style={[styles.button, styles.buttonClose, styles.buttonCancel]}
                  onPress={() => setVisible(false)}
                >
                  <Text style={[styles.textStyle, styles.textStyleCancel]}>{translateWord('cancel')}</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.buttonClose]} onPress={handleValidate}>
                  <Text style={styles.textStyle}>{translateWord('register')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    width: '100%',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 50,
  },
  selectorButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  leagueFilterContainer: {
    marginBottom: 10,
  },
  leagueRow: {
    flexDirection: 'row',
    marginBottom: 8,
    marginHorizontal: -4,
  },
  leagueChip: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueChipSelected: {
    backgroundColor: 'black',
    borderColor: 'black',
  },
  leagueChipText: {
    fontSize: 12,
    color: '#333',
  },
  leagueChipTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: {
    backgroundColor: '#696969',
    borderRadius: 5,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  separator: {
    height: 4,
    borderTopWidth: 1,
    borderColor: '#000',
    marginVertical: 0,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    marginTop: 15,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    flex: 1,
  },
  buttonClose: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'white',
  },
  buttonCancel: {
    backgroundColor: 'white',
    borderColor: 'black',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textStyleCancel: {
    color: 'black',
  },
});
