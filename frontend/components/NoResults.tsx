import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';

const REFRESH_COOLDOWN_MS = 60000;

export default function NoResults({ onRetry }: { onRetry?: () => void }) {
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const hasRetried = useRef(false);

  useEffect(() => {
    if (onRetry && !hasRetried.current) {
      onRetry();
      hasRetried.current = true;
    }

    if (typeof window !== 'undefined') {
      const lastRetry = sessionStorage.getItem('lastManualRetry');
      if (lastRetry) {
        const elapsed = Date.now() - parseInt(lastRetry, 10);
        if (elapsed < REFRESH_COOLDOWN_MS) {
          setIsCooldownActive(true);
          const remaining = REFRESH_COOLDOWN_MS - elapsed;
          const timer = setTimeout(() => {
            setIsCooldownActive(false);
          }, remaining);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [onRetry]);

  const handleManualRetry = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastManualRetry', Date.now().toString());
      setIsCooldownActive(true);
      setTimeout(() => setIsCooldownActive(false), REFRESH_COOLDOWN_MS);
    }

    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <ThemedView
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginVertical: 40,
      }}
    >
      <ThemedText
        style={{
          fontSize: 16,
          textAlign: 'center',
          opacity: 0.6,
          fontStyle: 'italic',
          fontWeight: 'bold',
        }}
      >
        {translateWord('noResults')}
      </ThemedText>
      {!isCooldownActive && (
        <TouchableOpacity onPress={handleManualRetry} style={{ marginTop: 20, padding: 10 }} activeOpacity={0.6}>
          <Ionicons name="refresh-outline" size={30} color="gray" />
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}
