import { ThemedText } from '@/components/ThemedText';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Stories from '../constants/Stories.json';

const Loader = () => {
  const [story, setStory] = useState<{ league?: string; categorie: string; anecdote: string } | null>(null);

  useEffect(() => {
    const isFrench = typeof navigator !== 'undefined' && navigator.language?.startsWith('fr');
    const lang: 'fr' | 'en' = isFrench ? 'fr' : 'en';
    const storiesList = Stories[lang];

    if (storiesList && storiesList.length > 0) {
      const randomStory = storiesList[Math.floor(Math.random() * storiesList.length)];
      setStory(randomStory);
    }
  }, []);

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
