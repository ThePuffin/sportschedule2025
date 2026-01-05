import { emoticonEnum } from '@/constants/enum';
import { getCache } from '@/utils/fetchData';
import { SelectorProps } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import React, { useEffect, useState } from 'react';
import Select, { StylesConfig } from 'react-select';

export default function Selector({
  data,
  onItemSelectionChange,
  allowMultipleSelection = false,
  isClearable = false,
}: Readonly<SelectorProps>) {
  const { items, i, itemSelectedId } = data;
  let { itemsSelectedIds = [] } = data;
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => {
    return getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || [];
  });

  useEffect(() => {
    const updateFavorites = () => {
      setFavoriteTeams(getCache<string[]>('favoriteTeams')?.filter((team) => team !== '') || []);
    };
    if (globalThis.window !== undefined) {
      globalThis.window.addEventListener('favoritesUpdated', updateFavorites);
      return () => globalThis.window.removeEventListener('favoritesUpdated', updateFavorites);
    }
  }, []);

  const [itemsSelection, setItemsSelection] = useState<{ value: string; label: string }[]>([]);

  const changeItem = (
    newValue: { value: string; label: string } | readonly { value: string; label: string }[] | null
  ) => {
    if (newValue) {
      if (Array.isArray(newValue)) {
        const selectAllWasClicked = newValue.some((option) => option.value === 'select-all');

        if (selectAllWasClicked) {
          const allItemIds = items.map((item) => (typeof item === 'string' ? item : item.uniqueId)).filter(Boolean);
          onItemSelectionChange(allItemIds, i);
        } else {
          const values = newValue.map((val) => val.value);
          onItemSelectionChange(values, i);
        }
      } else {
        onItemSelectionChange((newValue as { value: string }).value, i);
      }
    } else {
      // newValue is null
      if (allowMultipleSelection) {
        onItemSelectionChange([], i);
      } else {
        // Single selection cleared, send empty string
        onItemSelectionChange('', i);
      }
    }
  };

  useEffect(() => {
    const selectableItems = items.length
      ? (items.filter((i) => i) as any[]).map((item) => {
          if (typeof item === 'string') {
            const icon = ' ' + (emoticonEnum[item as keyof typeof emoticonEnum] || '');
            return { value: item, label: item + icon };
          }
          const league = item.league || item.value || '';
          const isAll = item.label === 'All' || item.uniqueId === 'ALL';
          const icon = !isAll && league ? ' ' + (emoticonEnum[league as keyof typeof emoticonEnum] || '') : '';
          const label = item.label === 'All' ? translateWord('all') : item.label;
          return { value: item.uniqueId, label: label + icon };
        })
      : [];
    const filteredItems = selectableItems.filter((item) => !itemsSelectedIds.includes(item.value));

    if (allowMultipleSelection && items.length > itemsSelectedIds.length) {
      filteredItems.unshift({ value: 'select-all', label: translateWord('all') });
    }
    // If favorite teams exist, prioritize them at the top
    if (favoriteTeams.length > 0) {
      filteredItems.sort((a, b) => {
        const aIsFav = favoriteTeams.includes(a.value) ? -1 : 1;
        const bIsFav = favoriteTeams.includes(b.value) ? -1 : 1;
        return aIsFav - bIsFav;
      });
    }
    setItemsSelection(filteredItems);
  }, [items, itemsSelectedIds, allowMultipleSelection, favoriteTeams]);

  const getValue = () => {
    if (allowMultipleSelection) {
      return items
        .filter((item) => {
          if (!item) return false;
          const id = typeof item === 'string' ? item : item.uniqueId;
          return itemsSelectedIds.includes(id);
        })
        .map((item) => {
          const league = typeof item === 'string' ? item : item.league || item.value;
          const isAll = typeof item === 'string' ? false : item.label === 'All' || item.uniqueId === 'ALL';
          const icon = !isAll && league ? ' ' + emoticonEnum[league as keyof typeof emoticonEnum] || '' : '';
          if (typeof item === 'string') {
            return { value: item, label: item + icon };
          }

          const base = item.label !== 'All' ? item.label : translateWord('all');
          return { value: item.uniqueId, label: base + icon };
        });
    }
    const selectedItem = items.find((item) => {
      if (!item) return false;
      if (typeof item === 'string') return item === itemSelectedId;
      return item.uniqueId === itemSelectedId;
    });

    if (selectedItem) {
      const league = typeof selectedItem === 'string' ? selectedItem : selectedItem.league;
      const isAll =
        typeof selectedItem === 'string' ? false : selectedItem.label === 'All' || selectedItem.uniqueId === 'ALL';
      const icon = !isAll && league ? ' ' + emoticonEnum[league as keyof typeof emoticonEnum] || '' : '';

      if (typeof selectedItem === 'string') {
        return { value: selectedItem, label: selectedItem + icon };
      }

      const base = selectedItem.label !== 'All' ? selectedItem.label : translateWord('all');
      return { value: selectedItem.uniqueId, label: base + icon };
    }
    return null;
  };

  const singleSelectedItem = items.find((item) => {
    if (!item) return false;
    if (typeof item === 'string') return item === itemSelectedId;
    return item.uniqueId === itemSelectedId;
  });
  const placeholder = singleSelectedItem
    ? typeof singleSelectedItem === 'string'
      ? singleSelectedItem +
        (singleSelectedItem ? ' ' + (emoticonEnum[singleSelectedItem as keyof typeof emoticonEnum] || '') : '')
      : (singleSelectedItem as any).label === 'All' || (singleSelectedItem as any).uniqueId === 'ALL'
      ? (singleSelectedItem as any).label
      : (singleSelectedItem as any).label +
        (' ' + emoticonEnum[(singleSelectedItem as any).league as keyof typeof emoticonEnum] || '')
    : translateWord('Filter');

  const targetHeight = 65;
  type OptionType = { value: string; label: string };
  const customStyles: StylesConfig<OptionType, boolean> = {
    control: (base) => ({
      ...base,
      minHeight: `${targetHeight}px`,
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px',
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: `${(targetHeight - 20 - 1 - 1) / 2}px`,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: `${(targetHeight - 20 - 1 - 1) / 3}px`,
    }),
  };

  return (
    <Select
      value={getValue()}
      placeholder={placeholder}
      isSearchable
      options={itemsSelection}
      onChange={changeItem}
      styles={customStyles}
      noOptionsMessage={() => translateWord('noOptionsAvailable')}
      isMulti={allowMultipleSelection}
      isDisabled={items.length === 0 || items.length === 1}
      maxMenuHeight={220}
      isClearable={isClearable !== undefined ? isClearable : !allowMultipleSelection}
    />
  );
}
