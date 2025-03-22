import { ThemedView } from '@/components/ThemedView';
import { ButtonsKind } from '../constants/enum';
import IconButton from './IconButton';
import { StyleSheet } from 'react-native';

interface ButtonsProps {
  data: { selectedTeamsNumber: number; selectedGamesNumber: number };
  onClicks: (clickedButton: string) => void;
}

export default function Buttons({
  data = { selectedTeamsNumber: null, selectedGamesNumber },
  onClicks,
}: Readonly<ButtonsProps>) {
  let disabledAdd = data.selectedTeamsNumber >= 6;
  let disabledRemove = data.selectedTeamsNumber <= 2;
  let isGamesSelected = data.selectedGamesNumber > 0;

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
