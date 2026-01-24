import { League } from '@/constants/enum';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterSliderProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  hasFavorites?: boolean;
  availableLeagues?: string[];
}

export default function FilterSlider({
  selectedFilter,
  onFilterChange,
  hasFavorites = true,
  availableLeagues,
}: FilterSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Custom colors matching the dark theme screenshot
  const selectedBackgroundColor = '#3b82f6';
  const unselectedTextColor = '#8E8E93';
  const selectedTextColor = '#FFFFFF';

  const items = [
    { label: translateWord('all'), value: 'ALL' },
    { label: translateWord('favorites'), value: 'FAVORITES', icon: 'star' },
    ...(availableLeagues || Object.values(League).filter((l) => l !== League.ALL)).map((l) => ({ label: l, value: l })),
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item, index) => {
          const selected = item.value === selectedFilter;
          const disabled = item.value === 'FAVORITES' && !hasFavorites;
          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.item,
                selected && { backgroundColor: selectedBackgroundColor },
                disabled && { opacity: 0.5 },
              ]}
              onPress={() => onFilterChange(item.value)}
              disabled={disabled}
            >
              {item.icon && (
                <Icon
                  name={item.icon}
                  type="font-awesome"
                  size={14}
                  color={selected ? selectedTextColor : '#fbbf24'} // Gold star if unselected? Screenshot shows grey text but maybe star is colored
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.itemText,
                  { color: selected ? selectedTextColor : unselectedTextColor },
                  selected && styles.selectedText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#000000', // Black background for the strip area as per screenshot seems dark
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'transparent', // Unselected has no bg in screenshot, just text
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    fontWeight: '700',
  },
});
