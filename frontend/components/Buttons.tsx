import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';
import { ButtonsKind } from '../constants/enum.ts';

interface ButtonsProps {
  onClicks: (clickedButton: string) => void;
}

export default function Buttons({ onClicks }: Readonly<ButtonProps>) {
  const isGamesSelected = false;
  const disabledAdd = false;
  const disabledRemove = false;

  const removeAllGames = () => {
    onClicks(ButtonsKind.REMOVEGAMES);
  };

  const addAColumn = () => {
    onClicks(ButtonsKind.ADDTEAM);
  };

  return (
    <ThemedView>
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3vh 1vh ' }}>
        <Button
          disabled={!isGamesSelected}
          icon={{
            name: 'trash',
            type: 'font-awesome',
            size: 30,
            color: 'white',
          }}
          iconRight
          loading={false}
          loadingProps={{ size: 'small', color: 'white' }}
          buttonStyle={{
            backgroundColor: 'rgba(214, 61, 57, 1)',
            borderRadius: 5,
          }}
          containerStyle={{
            marginHorizontal: '5vw',
            width: '20vw',
          }}
          onPress={() => removeAllGames()}
        />

        <Button
          disabled={disabledAdd}
          icon={{
            name: 'plus',
            type: 'font-awesome',
            size: 30,
            color: 'black',
          }}
          iconRight
          loading={false}
          loadingProps={{ size: 'small', color: 'black' }}
          buttonStyle={{
            backgroundColor: 'white',
            borderRadius: 5,
          }}
          containerStyle={{
            marginHorizontal: '5vw',
            width: '20vw',
          }}
          onPress={() => addAColumn()}
        />

        <Button
          disabled={disabledRemove}
          icon={{
            name: 'minus',
            type: 'font-awesome',
            size: 30,
            color: 'white',
          }}
          iconRight
          loading={false}
          loadingProps={{ size: 'small', color: 'white' }}
          buttonStyle={{
            borderColor: 'rgba(78, 116, 289, 1)',
            backgroundColor: 'black',
            borderRadius: 5,
          }}
          containerStyle={{
            marginHorizontal: '5vw',
            width: '20vw',
          }}
          onPress={() => onClicks(ButtonsKind.REMOVETEAM)}
        />
      </div>
    </ThemedView>
  );
}
