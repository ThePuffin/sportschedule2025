import { ThemedElements } from '@/components/ThemedElements';
import { ThemedText } from '@/components/ThemedText';
import { League } from '@/constants/enum';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface FilterSliderProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  hasFavorites?: boolean;
  availableLeagues?: string[];
  showFavorites?: boolean;
  showAll?: boolean;
  data?: { label: string; value: string; icon?: string }[];
  favoriteValues?: string[];
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  selectedItemStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  selectedTextStyle?: StyleProp<TextStyle>;
}

export default function FilterSlider({
  selectedFilter,
  onFilterChange,
  hasFavorites = true,
  availableLeagues,
  showFavorites = true,
  showAll = true,
  data,
  favoriteValues = [],
  style,
  itemStyle,
  selectedItemStyle,
  textStyle,
  selectedTextStyle,
}: FilterSliderProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Custom colors matching the dark theme screenshot
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#3b82f6');
  const unselectedTextColor = useThemeColor({ light: '#404040', dark: '#8E8E93' }, 'text');
  const unselectedBackgroundColor = 'rgba(120, 120, 120, 0.1)';

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

  const rawItems = useMemo(
    () =>
      data
        ? data
        : [
            ...(showAll ? [{ label: translateWord('all'), value: 'ALL' }] : []),
            ...(showFavorites ? [{ label: translateWord('favorites'), value: 'FAVORITES', icon: 'star' }] : []),
            ...(availableLeagues || Object.values(League).filter((l) => l !== League.ALL)).map((l) => ({
              label: l,
              value: l,
            })),
          ],
    [data, showAll, showFavorites, availableLeagues],
  );

  const items = useMemo(() => {
    const specialValues = ['ALL', 'all'];
    const result: typeof rawItems = [];
    const seenValues = new Set<string>();

    const addItem = (item: (typeof rawItems)[0] | undefined) => {
      if (item && !seenValues.has(item.value)) {
        seenValues.add(item.value);
        result.push(item);
      }
    };

    // 1. Add Selected item
    const selectedItem = rawItems.find((i) => i.value === selectedFilter);
    addItem(selectedItem);

    // 2. Add Special items (ALL)
    rawItems.forEach((item) => {
      if (specialValues.includes(item.value)) {
        addItem(item);
      }
    });

    // 3. Add FAVORITES item
    const favoritesItem = rawItems.find((i) => i.value === 'FAVORITES');
    addItem(favoritesItem);

    // 4. Add Favorites
    if (favoriteValues.length > 0) {
      favoriteValues.forEach((fav) => {
        const favItem = rawItems.find((i) => i.value === fav);
        addItem(favItem);
      });
    }

    // 5. Add remaining items
    rawItems.forEach((item) => {
      addItem(item);
    });

    return result;
  }, [rawItems, selectedFilter, favoriteValues]);

  return (
    <ThemedElements
      style={[
        styles.container,
        Platform.OS === 'web' &&
          ({
            maskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 99%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 99%, transparent 100%)',
          } as any),
        style,
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
            <React.Fragment key={item.value}>
              <TouchableOpacity
                style={[
                  styles.item,
                  { backgroundColor: selected ? selectedBackgroundColor : unselectedBackgroundColor },
                  itemStyle,
                  selected && selectedItemStyle,
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
                <ThemedText
                  style={[
                    styles.itemText,
                    { color: selected ? selectedTextColor : unselectedTextColor },
                    textStyle,
                    selected && selectedTextStyle,
                  ]}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
              {index === 0 && items.length > 1 && (
                <View style={styles.separator}>
                  <ThemedText style={styles.separatorText}>|</ThemedText>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </ThemedElements>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    justifyContent: 'center',
    marginRight: 8,
  },
  separatorText: {
    fontSize: 18,
    fontWeight: '300',
  },
});
