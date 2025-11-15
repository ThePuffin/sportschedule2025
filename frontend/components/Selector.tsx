import { SelectorProps } from '@/utils/types';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Selector({
  data,
  onItemSelectionChange,
  allowMultipleSelection = false,
}: Readonly<SelectorProps>) {
  const { items, i, itemSelectedId } = data;
  let { itemsSelectedIds } = data;

  const [itemsSelection, setItemsSelection] = useState<{ value: string; label: string }[]>([]);

  const changeItem = (
    newValue: { value: string; label: string } | readonly { value: string; label: string }[] | null
  ) => {
    if (newValue) {
      if (Array.isArray(newValue)) {
        itemsSelectedIds = newValue;
        const values = newValue.map((val) => val.value);
        onItemSelectionChange(values, i);
      } else {
        onItemSelectionChange((newValue as { value: string }).value, i);
      }
    }
  };

  useEffect(() => {
    const selectableItems = items.length
      ? (items.filter((i) => i) as any[])
          .map((item) => {
            if (typeof item === 'string') {
              return { value: item, label: item };
            }
            return { value: item.uniqueId, label: item.label };
          })
          .filter((item) => !itemsSelectedIds.includes(item.value))
      : [];

    setItemsSelection(selectableItems);
  }, [items, itemsSelectedIds]);

  const getValue = () => {
    if (allowMultipleSelection) {
      return items
        .filter((item) => {
          if (!item) return false;
          const id = typeof item === 'string' ? item : item.uniqueId;
          return itemsSelectedIds.includes(id);
        })
        .map((item) => {
          if (typeof item === 'string') {
            return { value: item, label: item };
          }
          return { value: item.uniqueId, label: item.label };
        });
    }
    const selectedItem = items.find((item) => {
      if (!item) return false;
      if (typeof item === 'string') return item === itemSelectedId;
      return item.uniqueId === itemSelectedId;
    });

    if (selectedItem) {
      if (typeof selectedItem === 'string') {
        return { value: selectedItem, label: selectedItem };
      }
      return { value: selectedItem.uniqueId, label: selectedItem.label };
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
      ? singleSelectedItem
      : singleSelectedItem.label
    : '';

  const targetHeight = 65;
  const customStyles = {
    control: (base: React.CSSProperties) => ({
      ...base,
      minHeight: 'initial',
    }),
    valueContainer: (base: React.CSSProperties) => ({
      ...base,
      height: `${targetHeight - 1 - 1}px`,
      padding: '0 8px',
    }),
    clearIndicator: (base: React.CSSProperties) => ({
      ...base,
      padding: `${(targetHeight - 20 - 1 - 1) / 2}px`,
    }),
    dropdownIndicator: (base: React.CSSProperties) => ({
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
      noOptionsMessage={() => ' '}
      isMulti={allowMultipleSelection}
      isDisabled={items.length === 0 || items.length === 1}
    />
  );
}
