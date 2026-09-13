import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { translateWord } from '@/utils/utils';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

const REFRESH_COOLDOWN_MS = 60000;

/** Formats an ISO date (YYYY-MM-DD) following the browser locale (e.g. 12 mai 2026 in FR). */
const formatDateLocalized = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface NoResultsProps {
  onRetry?: () => void;
  /** When provided, shows a "Show all results" button while the retry cooldown is active. */
  onShowAll?: () => void;
  /** When true, shows the "Enable history" button above the "No results" text. */
  showHistoryButton?: boolean;
  /** Called when the user taps the "Enable history" button. */
  onEnableHistory?: () => void;
  /** When provided, shows a "previous available date" navigation button (index tab). */
  previousAvailableDate?: string | null;
  /** When provided, shows a "next available date" navigation button (index tab). */
  nextAvailableDate?: string | null;
  /** Called with the chosen date (YYYY-MM-DD) when a nav button is tapped. */
  onGoToDate?: (date: string) => void;
}

export default function NoResults({
  onRetry,
  onShowAll,
  showHistoryButton,
  onEnableHistory,
  previousAvailableDate,
  nextAvailableDate,
  onGoToDate,
}: NoResultsProps) {
  const [isCooldownActive, setIsCooldownActive] = useState(false);

  useEffect(() => {
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
  }, []);

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
      {showHistoryButton && (
        <TouchableOpacity
          onPress={onEnableHistory}
          accessibilityLabel={translateWord('enableHistory')}
          style={{ marginBottom: 12, padding: 10 }}
          activeOpacity={0.6}
        >
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
            <MaterialIcons name="history" size={18} color="gray" style={{ marginRight: 8 }} />
            <ThemedText style={{ fontSize: 14, color: 'gray' }}>{translateWord('enableHistory')}</ThemedText>
          </View>
        </TouchableOpacity>
      )}
      {(!!previousAvailableDate || !!nextAvailableDate) && onGoToDate && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
          {!!previousAvailableDate && (
            <TouchableOpacity
              onPress={() => onGoToDate(previousAvailableDate)}
              accessibilityLabel={translateWord('previousAvailableDate')}
              style={{ padding: 10 }}
              activeOpacity={0.6}
            >
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
                <MaterialIcons name="history" size={18} color="gray" style={{ marginRight: 8 }} />
                <ThemedText style={{ fontSize: 14, color: 'gray' }}>
                  {`${translateWord('previousAvailableDate')} (${formatDateLocalized(previousAvailableDate)})`}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
          {!!nextAvailableDate && (
            <TouchableOpacity
              onPress={() => onGoToDate(nextAvailableDate)}
              accessibilityLabel={translateWord('nextAvailableDate')}
              style={{ padding: 10 }}
              activeOpacity={0.6}
            >
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
                <MaterialIcons name="update" size={18} color="gray" style={{ marginRight: 8 }} />
                <ThemedText style={{ fontSize: 14, color: 'gray' }}>
                  {`${translateWord('nextAvailableDate')} (${formatDateLocalized(nextAvailableDate)})`}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
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
