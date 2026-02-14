import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

interface FilterSliderProps {
  data?: { label: string; value: string }[];
  availableLeagues?: string[];
  selectedFilter?: string;
  selectedFilters?: string[];
  onFilterChange?: (value: string) => void;
  showFavorites?: boolean;
  hasFavorites?: boolean;
  favoriteValues?: string[];
  showAll?: boolean;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  selectedItemStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  selectedTextStyle?: StyleProp<TextStyle>;
}

export default function FilterSlider(props: FilterSliderProps) {
  const {
    data,
    availableLeagues,
    selectedFilter,
    selectedFilters,
    onFilterChange,
    style,
    itemStyle,
    selectedItemStyle,
    textStyle,
    selectedTextStyle,
  } = props;

  const themeTextColor = useThemeColor({}, 'text');
  const unselectedBackgroundColor = useThemeColor({ light: '#e0e0e0', dark: '#333333' }, 'background');
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#3b82f6');

  let items: { label: string; value: string }[] = [];

  if (data) {
    items = data;
  } else if (availableLeagues) {
    items = availableLeagues.map((l) => ({ label: l, value: l }));
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => {
          const isSelected = selectedFilters ? selectedFilters.includes(item.value) : selectedFilter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.chip,
                { backgroundColor: unselectedBackgroundColor },
                itemStyle,
                isSelected ? { backgroundColor: selectedBackgroundColor } : {},
                isSelected ? selectedItemStyle : {},
              ]}
              onPress={() => onFilterChange && onFilterChange(item.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: themeTextColor },
                  textStyle,
                  isSelected ? { color: selectedTextColor } : {},
                  isSelected ? selectedTextStyle : {},
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
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 5,
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 15,
    paddingLeft: 5,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
