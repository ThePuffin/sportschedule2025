import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import AppLogo from '@/components/AppLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';

export default function NotFoundScreen() {
  return (
    <ThemedView>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 15px 0 15px',
        }}
      >
        <AppLogo />
      </div>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{translateWord('wrongPage')}</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">{translateWord('homeScreen')}</ThemedText>
        </Link>
        <Link href="/" style={styles.link}>
          <img
            src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmpnZnAwajk3OGF5aGkzZWoweWZ0eWl1OWN3MmZteGVsZTJjcjV6ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wc3USjlCFXHh1FYkyA/giphy.gif"
            alt="mascott dance"
          />
        </Link>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
