import { Icon } from '@rneui/themed';

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
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3vh 1vh ' }}>
      <button
        disabled={!isGamesSelected}
        onClick={removeAllGames}
        style={{
          flex: 1,
          margin: '0 10px',
          backgroundColor: '#ff0000',
          color: '#ffffff',
          borderRadius: '5px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '16px',
          opacity: !isGamesSelected ? 0.5 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Icon type="font-awesome" name="trash" style={{ color: '#ffffff', padding: '0.1rem' }}></Icon>
          <Icon type="font-awesome" name="list" style={{ color: '#ffffff', padding: '0.1rem' }}></Icon>
        </div>
      </button>

      <button
        disabled={disabledAdd}
        onClick={addAColumn}
        style={{
          flex: 1,
          margin: '0 10px',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '5px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '16px',
          opacity: disabledAdd ? 0.5 : 1,
          border: '1px solid #000000',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Icon type="font-awesome" name="plus" style={{ color: '#000000', padding: '0.1rem' }}></Icon>
          <Icon type="font-awesome" name="columns" style={{ color: '#000000', padding: '0.1rem' }}></Icon>
        </div>
      </button>

      <button
        disabled={disabledRemove}
        onClick={removeLastColumn}
        style={{
          flex: 1,
          margin: '0 10px',
          backgroundColor: '#000000',
          color: '#ffffff',
          borderRadius: '5px',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '16px',
          opacity: disabledRemove ? 0.5 : 1,
          border: '1px solid #ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Icon type="font-awesome" name="minus" style={{ color: '#ffffff', padding: '0.1rem' }}></Icon>
          <Icon type="font-awesome" name="columns" style={{ color: '#ffffff', padding: '0.1rem' }}></Icon>
        </div>
      </button>
    </div>
  );
}
