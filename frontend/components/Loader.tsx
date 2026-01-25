import { ThemedText } from '@/components/ThemedText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Stories from '../constants/Stories.json';

interface LoaderProps {
  isLoading: boolean;
}

const Loader = ({ isLoading }: LoaderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [story, setStory] = useState<{ league?: string; categorie: string; anecdote: string } | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isLoading) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setIsVisible(true);
      startTimeRef.current = Date.now();

      const isFrench = typeof navigator !== 'undefined' && navigator.language?.startsWith('fr');
      const lang: 'fr' | 'en' = isFrench ? 'fr' : 'en';
      const storiesList = Stories[lang];

      if (storiesList && storiesList.length > 0) {
        const randomStory = storiesList[Math.floor(Math.random() * storiesList.length)];
        setStory(randomStory);
      }
    } else {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;

        if (elapsed > 5000 && elapsed < 15000) {
          const remaining = 15000 - elapsed;
          timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          setIsVisible(false);
          startTimeRef.current = null;
        }
      } else {
        setIsVisible(false);
      }
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      {story && (
        <View style={styles.storyContainer}>
          <ThemedText style={styles.category}>
            {story.league ? `${story.league} - ` : ''}
            {story.categorie}
          </ThemedText>
          <ThemedText style={styles.text}>{story.anecdote}</ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  storyContainer: {
    marginTop: 20,
    alignItems: 'center',
    maxWidth: '80%',
  },
  category: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default Loader;
