import FavModal from '@/components/FavModal';
import { getCache, saveCache } from '@/utils/fetchData';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

interface ActionButtonProps {
  scrollViewRef: React.RefObject<ScrollView>;
}

export interface ActionButtonRef {
  handleScroll: (event: any) => void;
}

const ActionButtonWithRef: React.ForwardRefRenderFunction<ActionButtonRef, ActionButtonProps> = (
  { scrollViewRef },
  ref,
) => {
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>(() => {
    return getCache<string[]>('favoriteTeams') || [];
  });

  const [isOpenModal, setIsOpenModal] = useState(favoriteTeams.length === 0);
  const [isVisibleScrollTop, setIsVisibleScrollTop] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToggle = (showTop: boolean) => {
    // 1. Fade Out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsVisibleScrollTop(showTop);

      // 3. Fade In
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldShowTop = scrollY > 200;

    // Only trigger animation if the visibility state actually needs to change
    if (shouldShowTop !== isVisibleScrollTop) {
      animateToggle(shouldShowTop);
    }
  };

  useImperativeHandle(ref, () => ({
    handleScroll,
  }));

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const saveTeams = (newTeams: string[]) => {
    setFavoriteTeams(newTeams);

    saveCache('favoriteTeams', newTeams);
    if (globalThis.window !== undefined) globalThis.window.dispatchEvent(new Event('favoritesUpdated'));
  };

  return (
    <>
      <FavModal
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        favoriteTeams={favoriteTeams}
        onSave={saveTeams} // Pass a save handler
      />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => {
            if (isVisibleScrollTop) {
              scrollToTop();
            } else {
              setIsOpenModal(true);
            }
          }}
        >
          <ThemedView
            style={[
              styles.button,
              {
                backgroundColor: isVisibleScrollTop ? 'black' : 'white',
                borderColor: isVisibleScrollTop ? 'white' : 'black',
              },
            ]}
          >
            <IconSymbol
              name={isVisibleScrollTop ? 'arrow.up' : 'gearshape.fill'}
              color={isVisibleScrollTop ? 'white' : 'black'}
              size={24}
            />
          </ThemedView>
        </TouchableOpacity>
      </Animated.View>
    </>
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
    borderWidth: 1,
    color: 'white',
  },
});

export const ActionButton = forwardRef(ActionButtonWithRef);
