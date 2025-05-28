import { IconButtonProps } from '@/utils/types';
import { Button, Icon } from '@rneui/themed';
import React from 'react';
import { StyleSheet } from 'react-native';

const IconButton: React.FC<IconButtonProps> = ({
  iconName,
  iconColor = 'white',
  buttonColor = 'black',
  borderColor = 'transparent',
  ...props
}) => {
  return (
    <Button
      icon={<Icon name={iconName} type="font-awesome" size={30} color={iconColor} />}
      iconRight
      loading={false}
      loadingProps={{ size: 'small', color: iconColor }}
      buttonStyle={[styles.button, { backgroundColor: buttonColor, borderColor }]}
      containerStyle={styles.container}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  container: {
    marginHorizontal: '5vw',
    width: '20vw',
  },
});

export default IconButton;
