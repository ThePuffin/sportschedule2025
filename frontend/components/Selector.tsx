import Select from 'react-select';
import React, { useEffect, useState } from 'react';

export default function Selector({ data }) {
  const { teamsSelectedIds, activeTeams, i, teamSelectedId } = data;
  let placeholder = activeTeams.filter((team: TeamType) => team.uniqueId === teamSelectedId)[0]?.label ?? '';

  const [teams, setTeams] = useState<TeamDocument[]>([]);
  const changeTeam = async (event: { value: string; label: string }) => {
    console.log(event);
  };

  useEffect(() => {
    async function fetchTeams() {
      const selectableTeams = activeTeams
        .filter((team: TeamType) => !teamsSelectedIds.includes(team.uniqueId))
        .map(({ label, uniqueId }) => {
          return { value: uniqueId, label };
        })
        .sort((a: TeamType, b: TeamType) => (a.label > b.label ? 1 : -1));

      setTeams(selectableTeams);
    }

    fetchTeams();
  }, []);

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
      defaultValue={teamSelectedId}
      placeholder={placeholder}
      isSearchable
      options={teams}
      onChange={changeTeam}
      styles={customStyles}
    />
  );
}
