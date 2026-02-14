import Selector from '@/components/Selector';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Team } from '@/utils/types';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';

interface TeamReorderSelectorProps {
  teams: string[];
  allTeams: Team[];
  maxTeams?: number;
  onChange: (teams: string[]) => void;
  allowedLeagues?: string[];
}

export default function TeamReorderSelector({
  teams,
  allTeams,
  maxTeams = 5,
  onChange,
  allowedLeagues = [],
}: Readonly<TeamReorderSelectorProps>) {
  const [isSmallDevice, setIsSmallDevice] = useState(Dimensions.get('window').width < 768);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [openFirstTeamSelector, setOpenFirstTeamSelector] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#000' }, 'background');
  const borderColor = useThemeColor({}, 'text');
  const effectiveIconColor = textColor;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsSmallDevice(window.width < 768);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (allowedLeagues.length > 0 && !teams.some((t) => !!t)) {
      setOpenFirstTeamSelector(true);
    }
  }, [allowedLeagues]);

  const handleSelection = (position: number, teamId: string | string[]) => {
    setOpenFirstTeamSelector(false);
    const id = Array.isArray(teamId) ? teamId[0] : teamId;
    const updatedTeams = [...teams];

    while (updatedTeams.length < maxTeams) updatedTeams.push('');

    updatedTeams[position] = id || '';

    const uniqueTeams = Array.from(new Set(updatedTeams.filter((team) => team !== ''))).filter((team) => !!team);

    while (uniqueTeams.length < maxTeams) uniqueTeams.push('');
    onChange(uniqueTeams);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newTeams = [...teams];
    const item = newTeams[draggedIndex];
    newTeams.splice(draggedIndex, 1);
    newTeams.splice(index, 0, item);
    onChange(newTeams);
    setDraggedIndex(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= teams.length) return;
    const newTeams = [...teams];
    const item = newTeams[index];
    newTeams.splice(index, 1);
    newTeams.splice(newIndex, 0, item);
    onChange(newTeams);
  };

  return (
    <View style={{ zIndex: 10 }}>
      {Array.from({ length: Math.min(teams.filter((t) => !!t).length + 1, maxTeams) }).map((_, index) => {
        const selectedId = teams[index] || '';
        const filteredItems = allTeams.filter(
          (team) =>
            (!teams.includes(team.uniqueId) || team.uniqueId === selectedId) &&
            (allowedLeagues.length === 0 || allowedLeagues.includes(team.league)),
        );
        const isFilled = !!selectedId;
        const countFilled = teams.filter((t) => !!t).length;

        return (
          <div
            key={selectedId || `empty-${index}`}
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
                marginBottom: 10,
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
                            color={textColor}
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
                            color={textColor}
                            style={{ marginTop: 2 }}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Icon name="bars" type="font-awesome" size={14} color={textColor} />
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
                  style={{ backgroundColor, borderColor }}
                  textStyle={{ color: textColor, fontWeight: 'normal' }}
                  iconColor={effectiveIconColor}
                />
              </View>
            </View>
          </div>
        );
      })}
    </View>
  );
}
