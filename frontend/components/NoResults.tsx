import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';
import React, { useEffect, useRef } from 'react';

export default function NoResults({ onRetry }: { onRetry?: () => void }) {
  const hasRetried = useRef(false);

  useEffect(() => {
    if (onRetry && !hasRetried.current) {
      onRetry();
      hasRetried.current = true;
    }
  }, [onRetry]);

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
    </ThemedView>
  );
}
