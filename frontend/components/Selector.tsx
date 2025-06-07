import { SelectorProps, Team } from '@/utils/types';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Selector({ data, onItemSelectionChange }: Readonly<SelectorProps>) {
  const { itemsSelectedIds, activeTeams, i, itemSelectedId } = data;

  const [teams, setTeams] = useState<{ value: string; label: string }[]>([]);

  const changeTeam = (newValue: { value: string; label: string } | null) => {
    if (newValue) {
      onItemSelectionChange(newValue.value, i);
    }
  };

  useEffect(() => {
    const selectableTeams = activeTeams.length
      ? activeTeams
          .filter((team: Team) => !itemsSelectedIds.includes(team.uniqueId))
          .map(({ label, uniqueId }) => {
            return { value: uniqueId, label };
          })
      : [];

    setTeams(selectableTeams);
  }, [activeTeams, itemsSelectedIds]);

  const selectedTeam: Team | undefined =
    activeTeams.length && activeTeams.find((team) => team.uniqueId === itemSelectedId)
      ? (activeTeams.find((team) => team.uniqueId === itemSelectedId) as Team)
      : undefined;
  const placeholder = selectedTeam?.label ?? '';

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
      value={selectedTeam ? { value: selectedTeam.uniqueId, label: selectedTeam.label } : null}
      placeholder={placeholder}
      isSearchable
      options={teams}
      onChange={changeTeam}
      styles={customStyles}
      noOptionsMessage={() => ' '}
    />
  );
}
