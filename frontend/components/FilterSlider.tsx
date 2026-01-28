import { League } from '@/constants/enum';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterSliderProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  hasFavorites?: boolean;
  availableLeagues?: string[];
  showFavorites?: boolean;
  showAll?: boolean;
  data?: { label: string; value: string; icon?: string }[];
}

export default function FilterSlider({
  selectedFilter,
  onFilterChange,
  hasFavorites = true,
  availableLeagues,
  showFavorites = true,
  showAll = true,
  data,
}: FilterSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Custom colors matching the dark theme screenshot
  const selectedBackgroundColor = '#3b82f6';
  const unselectedTextColor = '#8E8E93';
  const selectedTextColor = '#FFFFFF';

  const useDragScroll = (ref: React.RefObject<ScrollView>) => {
    useEffect(() => {
      if (Platform.OS === 'web' && ref.current) {
        // @ts-ignore
        const element = ref.current.getScrollableNode ? ref.current.getScrollableNode() : ref.current;
        if (element) {
          let isDown = false;
          let startX = 0;
          let scrollLeft = 0;

          const onMouseDown = (e: MouseEvent) => {
            isDown = true;
            element.style.cursor = 'grabbing';
            startX = e.pageX - element.offsetLeft;
            scrollLeft = element.scrollLeft;
          };
          const onMouseLeave = () => {
            isDown = false;
            element.style.cursor = 'grab';
          };
          const onMouseUp = () => {
            isDown = false;
            element.style.cursor = 'grab';
          };
          const onMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - element.offsetLeft;
            const walk = (x - startX) * 2;
            element.scrollLeft = scrollLeft - walk;
          };

          element.addEventListener('mousedown', onMouseDown);
          element.addEventListener('mouseleave', onMouseLeave);
          element.addEventListener('mouseup', onMouseUp);
          element.addEventListener('mousemove', onMouseMove);
          element.style.cursor = 'grab';

          return () => {
            element.removeEventListener('mousedown', onMouseDown);
            element.removeEventListener('mouseleave', onMouseLeave);
            element.removeEventListener('mouseup', onMouseUp);
            element.removeEventListener('mousemove', onMouseMove);
            element.style.cursor = 'default';
          };
        }
      }
    }, [ref]);
  };

  useDragScroll(scrollViewRef);

  const items = data
    ? data
    : [
        ...(showAll ? [{ label: translateWord('all'), value: 'ALL' }] : []),
        ...(showFavorites ? [{ label: translateWord('favorites'), value: 'FAVORITES', icon: 'star' }] : []),
        ...(availableLeagues || Object.values(League).filter((l) => l !== League.ALL)).map((l) => ({
          label: l,
          value: l,
        })),
      ];

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'web' &&
          ({
            backgroundImage: 'linear-gradient(90deg, transparent 0%, #000000 5%, #000000 95%, transparent 100%)',
            backgroundColor: 'transparent',
          } as any),
      ]}
    >
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
    backgroundColor: '#000000',
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
    backgroundColor: 'transparent',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    fontWeight: '700',
  },
});
