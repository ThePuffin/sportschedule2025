import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { ThemedView } from './ThemedView';

interface ScrollToTopButtonProps {
  scrollViewRef: React.RefObject<ScrollView>;
}

export interface ScrollToTopButtonRef {
  handleScroll: (event: any) => void;
}

const ScrollToTopButtonWithRef: React.ForwardRefRenderFunction<ScrollToTopButtonRef, ScrollToTopButtonProps> = ({ scrollViewRef }, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    if (scrollY > 200) {
      if (!isVisible) {
        setIsVisible(true);
        fadeIn();
      }
    } else {
      if (isVisible) {
        setIsVisible(false);
        fadeOut();
      }
    }
  };

  useImperativeHandle(ref, () => ({
    handleScroll,
  }));

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {isVisible && (
        <TouchableOpacity onPress={scrollToTop}>
          <ThemedView style={styles.button}>
            <IconSymbol name="arrow.up" size={24} color="white" />
          </ThemedView>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1,
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 50,
    padding: 10,
    borderColor: 'white',
    borderWidth: 2,
  },
});

export const ScrollToTopButton = forwardRef(ScrollToTopButtonWithRef);