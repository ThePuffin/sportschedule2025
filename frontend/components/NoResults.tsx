import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

const REFRESH_COOLDOWN_MS = 60000;

interface NoResultsProps {
  onRetry?: () => void;
  /** When provided, shows a "Show all results" button while the retry cooldown is active. */
  onShowAll?: () => void;
}

export default function NoResults({ onRetry, onShowAll }: NoResultsProps) {
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
      {/* When retry is unavailable (cooldown active) and the user has a filtered view,
          offer to switch back to the "All" option. */}
      {isCooldownActive && onShowAll && (
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <TouchableOpacity onPress={onShowAll} style={{ padding: 10 }} activeOpacity={0.6}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'gray',
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
            >
              <Ionicons name="eye-outline" size={18} color="gray" style={{ marginRight: 8 }} />
              <ThemedText style={{ fontSize: 14, color: 'gray' }}>{translateWord('showAllResults')}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}
