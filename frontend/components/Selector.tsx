import { League, SelectorProps, Team } from '@/utils/types';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Selector({ data, onItemSelectionChange }: Readonly<SelectorProps>) {
  const { itemsSelectedIds, items, i, itemSelectedId } = data;

  const [itemsSelection, setItemsSelection] = useState<{ value: string; label: string }[]>([]);

  const changeItem = (newValue: { value: string; label: string } | null) => {
    if (newValue) {
      onItemSelectionChange(newValue.value, i);
    }
  };

  useEffect(() => {
    const selectableItems = items.length
      ? items
          .filter((item: Team | League) => !itemsSelectedIds.includes(item.uniqueId))
          .map(({ label, uniqueId }) => {
            return { value: uniqueId, label };
          })
      : [];

    setItemsSelection(selectableItems);
  }, [items, itemsSelectedIds]);

  const selectedItem =
    items.length && items.find((item) => item.uniqueId === itemSelectedId)
      ? (items.find((item) => item.uniqueId === itemSelectedId) as Team | League)
      : undefined;
  const placeholder = selectedItem?.label ?? '';

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
      value={selectedItem ? { value: selectedItem.uniqueId, label: selectedItem.label } : null}
      placeholder={placeholder}
      isSearchable
      options={itemsSelection}
      onChange={changeItem}
      styles={customStyles}
      noOptionsMessage={() => ' '}
    />
  );
}
