import { useHorizontalScroll } from '@/context/HorizontalScrollContext';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

interface FilterSliderProps {
  readonly data?: { label: string; value: string; icon?: React.ReactNode }[];
  readonly availableLeagues?: string[];
  readonly selectedFilter?: string;
  readonly selectedFilters?: string[];
  readonly onFilterChange?: (value: string) => void;
  readonly favoriteValues?: string[];
  readonly style?: StyleProp<ViewStyle>;
  readonly itemStyle?: StyleProp<ViewStyle>;
  readonly selectedItemStyle?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
  readonly selectedTextStyle?: StyleProp<TextStyle>;
  readonly multipleSelection?: boolean;
  readonly disabledValues?: string[];
  readonly disableSort?: boolean;
  /** Offset (px) the ScrollView extends under the left button (via negative margin): the left fade ramps from the ScrollView's left edge (under the button) to full opacity ~15px past the button's right edge */
  readonly fadeLeftInset?: number;
  /** Same as fadeLeftInset but for the right edge */
  readonly fadeRightInset?: number;
  /** Left padding applied to the ScrollView's content (compensates a negative margin when the slider extends under a button) */
  readonly scrollPaddingLeft?: number;
  /** Right padding applied to the ScrollView's content (compensates a negative margin when the slider extends under a button) */
  readonly scrollPaddingRight?: number;
}

export default function FilterSlider(props: Readonly<FilterSliderProps>) {
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
    multipleSelection = false,
    favoriteValues,
    disabledValues,
    fadeLeftInset = 0,
    fadeRightInset = 0,
    scrollPaddingLeft = 0,
    scrollPaddingRight = 0,
  } = props;

  const themeTextColor = useThemeColor({}, 'text');
  const unselectedBackgroundColor = useThemeColor({ light: '#e0e0e0', dark: '#333333' }, 'background');
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#000');
  const { setIsScrollingHorizontally } = useHorizontalScroll();

  const scrollViewRef = useRef<ScrollView>(null);

  // Edge-fade state: the right fade is only shown when the end of the list is not reached yet.
  // The left fade is ALWAYS applied (from the initial render, no scroll needed).
  const [atEnd, setAtEnd] = useState(false);
  const metrics = useRef({ offset: 0, contentWidth: 0, visibleWidth: 0 });
  const recomputeEdges = () => {
    const m = metrics.current;
    const next = m.offset >= m.contentWidth - m.visibleWidth - 2;
    // avoid re-rendering the whole chip list on every scroll frame
    setAtEnd((prev) => (prev === next ? prev : next));
  };
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    metrics.current.offset = e.nativeEvent.contentOffset.x;
    metrics.current.contentWidth = e.nativeEvent.contentSize.width;
    metrics.current.visibleWidth = e.nativeEvent.layoutMeasurement.width;
    recomputeEdges();
  };
  const edgeMask = useMemo(() => {
    // fadeLeftInset/fadeRightInset = width (px) covered by the opaque button at the ScrollView's
    // edges. The gradient ramp sits ENTIRELY in the visible area (like the date sliders):
    // hidden under the button (0..inset), then a 40px visible fade starting at the button's edge.
    // The left fade is ALWAYS applied — no need to wait for a first scroll.
    const left = `transparent ${fadeLeftInset}px, black ${fadeLeftInset + 40}px`;
    const right = atEnd
      ? 'black 100%'
      : `black calc(100% - ${fadeRightInset + 40}px), transparent calc(100% - ${fadeRightInset}px)`;
    return `linear-gradient(to right, ${left}, ${right})`;
  }, [atEnd, fadeLeftInset, fadeRightInset]);

  useEffect(() => {
    if (Platform.OS === 'web' && scrollViewRef.current) {
      // @ts-ignore
      const element: HTMLElement | null = scrollViewRef.current.getScrollableNode
        ? scrollViewRef.current.getScrollableNode()
        : scrollViewRef.current;
      if (element) {
        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;
        let dragged = 0;
        let suppressClick: ((e: Event) => void) | null = null;

        const onMouseMove = (e: MouseEvent) => {
          if (!isDown) return;
          e.preventDefault();
          const walk = (e.pageX - startX) * 2;
          dragged = Math.max(dragged, Math.abs(walk));
          element.scrollLeft = scrollLeft - walk;
        };
        // mouseup is listened on window so the drag keeps working even when the cursor
        // leaves the bar (mouseleave no longer cancels it mid-drag)
        const onMouseUp = () => {
          if (!isDown) return;
          isDown = false;
          setIsScrollingHorizontally(false);
          element.style.cursor = 'grab';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (dragged > 5) {
            // swallow the click that follows a drag so no chip gets selected accidentally
            suppressClick = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
            };
            document.addEventListener('click', suppressClick, { capture: true, once: true });
            setTimeout(() => {
              if (suppressClick) document.removeEventListener('click', suppressClick, { capture: true });
              suppressClick = null;
            }, 100);
          }
        };
        const onMouseDown = (e: MouseEvent) => {
          e.preventDefault(); // no native text-selection drag, which hijacks the mousemove events
          isDown = true;
          dragged = 0;
          setIsScrollingHorizontally(true);
          element.style.cursor = 'grabbing';
          startX = e.pageX;
          scrollLeft = element.scrollLeft;
          document.body.style.userSelect = 'none'; // no text selection while dragging
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        };

        // Edge measurement directly on the DOM node: RN's onLayout/onContentSizeChange report
        // the element's full width (including the part hidden under an overlapping button),
        // which declared "atEnd" too early and removed the right fade while content was still hidden.
        const measure = () => {
          metrics.current.offset = element.scrollLeft;
          metrics.current.contentWidth = element.scrollWidth;
          metrics.current.visibleWidth = element.clientWidth;
          recomputeEdges();
        };
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('scroll', measure, { passive: true });
        element.style.cursor = 'grab';
        resizeObserver?.observe(element);
        if (element.firstElementChild) resizeObserver?.observe(element.firstElementChild);
        measure();
        const settleTimer = setTimeout(measure, 300); // re-measure once fonts/chips have settled

        return () => {
          element.removeEventListener('mousedown', onMouseDown);
          element.removeEventListener('scroll', measure);
          resizeObserver?.disconnect();
          clearTimeout(settleTimer);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          document.body.style.userSelect = '';
          element.style.cursor = 'default';
        };
      }
    }
  }, [setIsScrollingHorizontally]);

  const sortedItems = useMemo(() => {
    let items: { label: string; value: string; icon?: React.ReactNode }[] = [];

    if (data) {
      items = [...data];
    } else if (availableLeagues) {
      items = availableLeagues.map((l) => ({ label: l, value: l }));
    }

    if (props.disableSort) {
      return items;
    }

    if (multipleSelection) {
      items = [...items].sort((a, b) => a.label.localeCompare(b.label));
    } else {
      const selectedItem = items.find((item) => item.value === selectedFilter);
      const bookmarksItem = items.find((item) => item.value === 'BOOKMARKS' && item.value !== selectedFilter);
      const allItem = items.find(
        (item) => (item.value === 'ALL' || item.value === 'all' || item.value === '') && item.value !== selectedFilter,
      );

      const remainingItems = items.filter(
        (item) =>
          item.value !== selectedFilter &&
          item.value !== 'ALL' &&
          item.value !== 'all' &&
          item.value !== '' &&
          item.value !== 'BOOKMARKS',
      );

      const favoriteItems = remainingItems
        .filter((item) => favoriteValues?.includes(item.value))
        .sort((a, b) => a.label.localeCompare(b.label));
      const otherItems = remainingItems
        .filter((item) => !favoriteValues?.includes(item.value))
        .sort((a, b) => a.label.localeCompare(b.label));

      items = [
        ...(selectedItem ? [selectedItem] : []),
        ...(allItem ? [allItem] : []),
        ...(bookmarksItem ? [bookmarksItem] : []),
        ...favoriteItems,
        ...otherItems,
      ];
    }

    // If disabledValues is provided, put active items first, then disabled items,
    // preserving alphabetical order within each group
    if (disabledValues && disabledValues.length > 0) {
      const activeItems = items.filter((item) => !disabledValues.includes(item.value));
      const inactiveItems = items.filter((item) => disabledValues.includes(item.value));
      items = [...activeItems, ...inactiveItems];
    }

    return items;
  }, [data, availableLeagues, multipleSelection, selectedFilter, favoriteValues, props.disableSort, disabledValues]);

  const sortedValuesKey = useMemo(() => {
    return sortedItems.map((item) => item.value).join('|');
  }, [sortedItems]);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
    setAtEnd(false);
  }, [sortedValuesKey]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingLeft: 5 + scrollPaddingLeft, paddingRight: 15 + scrollPaddingRight }]}
        style={[{ maskImage: edgeMask, WebkitMaskImage: edgeMask } as any]}
        onScroll={handleScroll}
        onLayout={(e) => {
          metrics.current.visibleWidth = e.nativeEvent.layout.width;
          recomputeEdges();
        }}
        onContentSizeChange={(w) => {
          metrics.current.contentWidth = w;
          recomputeEdges();
        }}
        scrollEventThrottle={16}
      >
        {sortedItems.map((item, index) => {
          const isSelected = selectedFilters ? selectedFilters.includes(item.value) : selectedFilter === item.value;
          const isDisabled = disabledValues?.includes(item.value);
          return (
            <React.Fragment key={item.value}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: unselectedBackgroundColor },
                  itemStyle,
                  isSelected ? { backgroundColor: selectedBackgroundColor } : {},
                  isSelected ? selectedItemStyle : {},
                  isDisabled && styles.disabledChip,
                  Platform.OS === 'web' && ({ cursor: isDisabled ? 'default' : 'pointer' } as any),
                ]}
                onPress={() => !isDisabled && onFilterChange?.(item.value)}
                disabled={isDisabled}
              >
                {item.icon ? (
                  item.icon
                ) : (
                  <Text
                    style={[
                      styles.chipText,
                      { color: themeTextColor },
                      textStyle,
                      isSelected ? { color: selectedTextColor } : {},
                      isSelected ? selectedTextStyle : {},
                      isDisabled && styles.disabledChipText,
                    ]}
                  >
                    {item.label}
                  </Text>
                )}
              </TouchableOpacity>
              {!multipleSelection && index === 0 && isSelected && sortedItems.length > 1 && (
                <View
                  style={{
                    width: 1,
                    height: 20,
                    backgroundColor: themeTextColor,
                    opacity: 0.2,
                    marginHorizontal: 5,
                  }}
                />
              )}
            </React.Fragment>
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
  disabledChip: {
    opacity: 0.4,
  },
  disabledChipText: {
    opacity: 0.7,
  },
});
