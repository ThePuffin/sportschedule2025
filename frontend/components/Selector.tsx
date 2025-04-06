import { Team } from '@/utils/types';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';

interface SelectorProps {
  data: {
    teamsSelectedIds: string[];
    activeTeams: Team[];
    i: number;
    teamSelectedId: string;
  };
  onTeamSelectionChange: (teamSelectedId: string, i: number) => void;
}

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

  const selectedTeam = activeTeams.length ? activeTeams.find((team) => team.uniqueId === teamSelectedId) : {};
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
