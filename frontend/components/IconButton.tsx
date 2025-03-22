import React from 'react';
import { Button, ButtonProps, Icon } from '@rneui/themed';
import { StyleSheet } from 'react-native';

interface IconButtonProps extends ButtonProps {
  iconName: string;
  iconColor?: string;
  buttonColor?: string;
  borderColor?: string;
}

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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  container: {
    marginHorizontal: '5vw',
    width: '20vw',
  },
});

export default IconButton;
