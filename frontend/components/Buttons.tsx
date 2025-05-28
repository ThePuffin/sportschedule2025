import { ThemedView } from '@/components/ThemedView';
import { ButtonsProps } from '@/utils/types';
import { StyleSheet } from 'react-native';
import { ButtonsKind } from '../constants/enum';
import IconButton from './IconButton';

export default function Buttons({
  data = { selectedTeamsNumber: 0, selectedGamesNumber: 0, loadingTeams: false },
  onClicks,
}: Readonly<ButtonsProps>) {
  const { selectedTeamsNumber, selectedGamesNumber, loadingTeams } = data;

  const disabledAdd = loadingTeams || selectedTeamsNumber >= 6;
  const disabledRemove = loadingTeams || selectedTeamsNumber <= 2;
  const isGamesSelected = selectedGamesNumber > 0;

  return (
    <ThemedView>
      <div style={styles.container}>
        <IconButton
          iconName="trash"
          buttonColor="rgba(214, 61, 57, 1)"
          disabled={!isGamesSelected}
          onPress={() => onClicks(ButtonsKind.REMOVEGAMES)}
        />

        <IconButton
          iconName="plus"
          buttonColor="white"
          iconColor="black"
          disabled={disabledAdd}
          onPress={() => onClicks(ButtonsKind.ADDTEAM)}
        />

        <IconButton
          iconName="minus"
          buttonColor="black"
          borderColor="rgba(78, 116, 289, 1)"
          disabled={disabledRemove}
          onPress={() => onClicks(ButtonsKind.REMOVETEAM)}
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
