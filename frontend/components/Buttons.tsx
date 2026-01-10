import { ThemedView } from '@/components/ThemedView';
import { ButtonsProps } from '@/utils/types';
import { StyleSheet } from 'react-native';
import { ButtonsKind } from '../constants/enum';
import IconButton from './IconButton';
import { translateWord } from '@/utils/utils';

export default function Buttons({
  data = { selectedTeamsNumber: 0, selectedGamesNumber: 0, loadingTeams: false, maxTeamsNumber: 6 },
  onClicks,
}: Readonly<ButtonsProps>) {
  const { selectedTeamsNumber, selectedGamesNumber, loadingTeams, maxTeamsNumber = 6 } = data;

  const disabledAdd = loadingTeams || selectedTeamsNumber >= maxTeamsNumber;
  const disabledRemove = loadingTeams || selectedTeamsNumber <= 2;
  const isGamesSelected = selectedGamesNumber > 0;

  return (
    <ThemedView>
      <div style={styles.container}>
        <IconButton
          iconName="trash"
          secondaryIconName="calendar-check-o"
          buttonColor="rgba(214, 61, 57, 1)"
          disabled={!isGamesSelected}
          onPress={() => onClicks(ButtonsKind.REMOVEGAMES)}
          text={translateWord('deleteSelection')}
        />

        <IconButton
          iconName="plus"
          secondaryIconName="columns"
          buttonColor="white"
          iconColor="black"
          disabled={disabledAdd}
          onPress={() => onClicks(ButtonsKind.ADDTEAM)}
          text={translateWord('addColumn')}
        />

        <IconButton
          iconName="minus"
          secondaryIconName="columns"
          buttonColor="black"
          borderColor="rgba(78, 116, 289, 1)"
          disabled={disabledRemove}
          onPress={() => onClicks(ButtonsKind.REMOVETEAM)}
          text={translateWord('removeColumn')}
        />
      </div>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '3vh',
    marginBottom: '3vh',
    marginLeft: '1vh',
    marginRight: '1vh',
  },
});
