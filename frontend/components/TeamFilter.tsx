import FilterSlider from '@/components/FilterSlider';
import Selector from '@/components/Selector';
import { ThemedElements } from '@/components/ThemedElements';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { View } from 'react-native';

interface TeamFilterProps {
  icon: React.ReactNode;
  selectorData: any;
  onSelectorChange: (item: string | string[]) => void;
  selectorPlaceholder?: string;
  isClearable?: boolean;
  filterData: { label: string; value: string }[];
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  favoriteValues?: string[];
}

export default function TeamFilter({
  icon,
  selectorData,
  onSelectorChange,
  selectorPlaceholder,
  isClearable = true,
  filterData,
  selectedFilter,
  onFilterChange,
  favoriteValues = [],
}: TeamFilterProps) {
  const backgroundColor = useThemeColor({ light: '#F0F0F0', dark: '#121212' }, 'background');
  const iconColor = useThemeColor({}, 'text');

  const themedIcon = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<any>, { color: iconColor })
    : icon;

  return (
    <ThemedElements>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          alignItems: 'center',
          paddingLeft: 15,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            backgroundColor,
            border: `1px solid ${iconColor}`,
            borderRadius: '50%',
            flexShrink: 0,
            zIndex: 20, // stays above any overlapping content
          }}
        >
          {themedIcon}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              overflow: 'hidden',
              zIndex: 10,
            }}
          >
            <Selector
              data={selectorData}
              onItemSelectionChange={onSelectorChange}
              allowMultipleSelection={false}
              isClearable={isClearable}
              placeholder={selectorPlaceholder}
            />
          </div>
        </div>
        {/* The selected chip is pinned by FilterSlider right after this button, followed by the
            separator; the ScrollView starts AFTER them, so it no longer extends under the button
            and the left edge fade applies to the first scrollable chip (inside FilterSlider) */}
        <View style={{ flex: 1 }}>
          <FilterSlider
            selectedFilter={selectedFilter}
            onFilterChange={onFilterChange}
            data={filterData}
            favoriteValues={favoriteValues}
          />
        </View>
      </div>
    </ThemedElements>
  );
}
