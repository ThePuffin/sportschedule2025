import { SelectorProps, Team } from '@/utils/types';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

export default function Selector({ data, onTeamSelectionChange }: Readonly<SelectorProps>) {
  const { teamsSelectedIds, activeTeams, i, teamSelectedId } = data;

  const [teams, setTeams] = useState<{ value: string; label: string }[]>([]);

  const changeTeam = (event: { value: string; label: string }) => {
    onTeamSelectionChange(event.value, i);
  };

  useEffect(() => {
    const selectableTeams = activeTeams.length
      ? activeTeams
          .filter((team: Team) => !teamsSelectedIds.includes(team.uniqueId))
          .map(({ label, uniqueId }) => {
            return { value: uniqueId, label };
          })
      : [];

    setTeams(selectableTeams);
  }, [activeTeams, teamsSelectedIds]);

  const selectedTeam: Team | undefined =
    activeTeams.length && activeTeams.find((team) => team.uniqueId === teamSelectedId)
      ? (activeTeams.find((team) => team.uniqueId === teamSelectedId) as Team)
      : undefined;
  const placeholder = selectedTeam?.label ?? '';

  const targetHeight = 65;
  const customStyles = {
    control: (base) => ({
      ...base,
      minHeight: 'initial',
    }),
    valueContainer: (base) => ({
      ...base,
      height: `${targetHeight - 1 - 1}px`,
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
