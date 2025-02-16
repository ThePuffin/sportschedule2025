import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';

export default function Buttons({}) {
  const isGamesSelected = false;
  const disabledAdd = false;
  const disabledRemove = false;

  const removeAllGames = () => {
    console.log('removeAllgames');
  };

  const addAColumn = () => {
    console.log('addAColumn');
  };

  const removeLastColumn = () => {
    console.log('removeLastColumn');
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
          onPress={() => removeLastColumn()}
        />
      </div>
    </ThemedView>
  );
}
