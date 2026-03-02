import { useHorizontalScroll } from '@/context/HorizontalScrollContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface SliderDatePickerProps {
  selectDate: Date;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
}

export default function SliderDatePicker({
  selectDate,
  onDateChange,
  disabled = false,
  minDate,
  maxDate,
}: SliderDatePickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const monthScrollViewRef = useRef<ScrollView>(null);
  const { setIsScrollingHorizontally } = useHorizontalScroll();
  const [dates, setDates] = useState<Date[]>([]);
  const [months, setMonths] = useState<Date[]>([]);
  const [locale, setLocale] = useState('en-US');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const theme = useColorScheme() ?? 'light';

  // Custom colors to match the screenshot
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#3b82f6');
  const unselectedBackgroundColor = 'rgba(120, 120, 120, 0.1)'; // Subtle dark grey for unselected
  const unselectedTextColor = useThemeColor({ light: '#404040', dark: '#8E8E93' }, 'text');

  const ITEM_WIDTH = 55;
  const ITEM_SPACING = 8;
  const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_SPACING * 2;
  const MONTH_ITEM_WIDTH = 150;
  const { width: windowWidth } = useWindowDimensions();
  const today = new Date();

  // Sécurisation des dates limites (conversion string -> Date si nécessaire)
  const safeMinDate = useMemo(() => (minDate ? new Date(minDate) : undefined), [minDate]);
  const safeMaxDate = useMemo(() => (maxDate ? new Date(maxDate) : undefined), [maxDate]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    const startOfMonth = new Date(selectDate.getFullYear(), selectDate.getMonth(), 1);

    if (safeMinDate && safeMaxDate) {
      const minMonth = new Date(safeMinDate.getFullYear(), safeMinDate.getMonth(), 1);
      const maxMonth = new Date(safeMaxDate.getFullYear(), safeMaxDate.getMonth(), 1);

      if (
        months.length > 0 &&
        months[0].getTime() === minMonth.getTime() &&
        months[months.length - 1].getTime() === maxMonth.getTime()
      ) {
        return;
      }

      const newMonths: Date[] = [];
      const current = new Date(minMonth);
      while (current <= maxMonth) {
        newMonths.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      setMonths(newMonths);
      return;
    }

    let isRangeValid = true;
    if (months.length > 0) {
      if (safeMinDate) {
        const minMonth = new Date(safeMinDate.getFullYear(), safeMinDate.getMonth(), 1);
        if (months[0] < minMonth) isRangeValid = false;
      }
      if (safeMaxDate) {
        const maxMonth = new Date(safeMaxDate.getFullYear(), safeMaxDate.getMonth(), 1);
        if (months[months.length - 1] > maxMonth) isRangeValid = false;
      }
    }

    const isMonthInCurrentRange =
      months.length > 0 && months[0] <= startOfMonth && months[months.length - 1] >= startOfMonth;

    if (!isMonthInCurrentRange || !isRangeValid) {
      const newMonths: Date[] = [];
      for (let i = -6; i <= 6; i++) {
        const d = new Date(startOfMonth);
        d.setMonth(startOfMonth.getMonth() + i);

        if (safeMinDate) {
          const minMonth = new Date(safeMinDate.getFullYear(), safeMinDate.getMonth(), 1);
          if (d < minMonth) continue;
        }
        if (safeMaxDate) {
          const maxMonth = new Date(safeMaxDate.getFullYear(), safeMaxDate.getMonth(), 1);
          if (d > maxMonth) continue;
        }
        newMonths.push(d);
      }
      setMonths(newMonths);
    }
  }, [selectDate, safeMinDate, safeMaxDate]);

  useEffect(() => {
    if (months.length > 0 && monthScrollViewRef.current) {
      const index = months.findIndex(
        (m) => m.getMonth() === selectDate.getMonth() && m.getFullYear() === selectDate.getFullYear(),
      );
      if (index !== -1) {
        const x = index * MONTH_ITEM_WIDTH - windowWidth / 2 + MONTH_ITEM_WIDTH / 2;
        monthScrollViewRef.current.scrollTo({ x: x, animated: true });
      }
    }
  }, [selectDate, months, windowWidth]);

  useEffect(() => {
    let isRangeValid = true;
    if (dates.length > 0) {
      if (safeMinDate) {
        const minTime = new Date(safeMinDate).setHours(0, 0, 0, 0);
        if (dates[0].getTime() < minTime) isRangeValid = false;
      }
      if (safeMaxDate) {
        const maxTime = new Date(safeMaxDate).setHours(0, 0, 0, 0);
        if (dates[dates.length - 1].getTime() > maxTime) isRangeValid = false;
      }
    }

    const isDateInCurrentRange = dates.length > 0 && dates[0] <= selectDate && dates[dates.length - 1] >= selectDate;

    if (!isDateInCurrentRange || !isRangeValid) {
      const baseDate = new Date(selectDate);
      const newDates: Date[] = [];
      for (let i = -30; i <= 30; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);

        const dTime = new Date(d).setHours(0, 0, 0, 0);
        if (safeMinDate && dTime < new Date(safeMinDate).setHours(0, 0, 0, 0)) continue;
        if (safeMaxDate && dTime > new Date(safeMaxDate).setHours(0, 0, 0, 0)) continue;

        newDates.push(d);
      }
      setDates(newDates);
    }
  }, [selectDate, safeMinDate, safeMaxDate]);

  useEffect(() => {
    if (dates.length > 0 && scrollViewRef.current) {
      const index = dates.findIndex((d) => d.toDateString() === selectDate.toDateString());
      if (index !== -1) {
        // Center the selected item
        const x = index * TOTAL_ITEM_WIDTH - windowWidth / 2 + TOTAL_ITEM_WIDTH / 2;
        scrollViewRef.current.scrollTo({ x: x, animated: true });
      }
    }
  }, [selectDate, dates, windowWidth]);

  const getDayName = (date: Date) => {
    return date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
  };

  const DayNumber = (date: Date) => {
    return date.getDate();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectDate.toDateString();
  };

  const isMonthSelected = (date: Date) => {
    return date.getMonth() === selectDate.getMonth() && date.getFullYear() === selectDate.getFullYear();
  };

  const onMonthSelect = (date: Date) => {
    const newDate = new Date(selectDate);
    const targetDay = selectDate.getDate();
    newDate.setDate(1); // Avoid overflow when changing month
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    const daysInMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    newDate.setDate(Math.min(targetDay, daysInMonth));

    if (safeMinDate && newDate < safeMinDate) {
      newDate.setTime(safeMinDate.getTime());
    }
    if (safeMaxDate && newDate > safeMaxDate) {
      newDate.setTime(safeMaxDate.getTime());
    }
    onDateChange(newDate);
  };

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
            setIsScrollingHorizontally(true);
            element.style.cursor = 'grabbing';
            startX = e.pageX - element.offsetLeft;
            scrollLeft = element.scrollLeft;
          };
          const onMouseLeave = () => {
            isDown = false;
            setIsScrollingHorizontally(false);
            element.style.cursor = 'grab';
          };
          const onMouseUp = () => {
            isDown = false;
            setIsScrollingHorizontally(false);
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
    }, [ref, setIsScrollingHorizontally]);
  };

  useDragScroll(scrollViewRef);
  useDragScroll(monthScrollViewRef);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, opacity: disabled ? 0.5 : 1 },
        Platform.OS === 'web' &&
          ({
            maskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 99%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 1%, black 99%, transparent 100%)',
          } as any),
      ]}
    >
      <View style={styles.monthContainer}>
        <ScrollView
          ref={monthScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {months.map((date, index) => {
            const selected = isMonthSelected(date);
            const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            return (
              <TouchableOpacity
                key={date.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                disabled={disabled}
                style={[
                  styles.monthItem,
                  {
                    width: MONTH_ITEM_WIDTH,
                    borderWidth: isCurrentMonth ? 1 : 0,
                    borderColor: isCurrentMonth ? selectedBackgroundColor : 'transparent',
                    borderRadius: 15,
                  },
                ]}
                onPress={() => onMonthSelect(date)}
              >
                <Text
                  style={[
                    styles.monthText,
                    {
                      color:
                        selected && isCurrentMonth && theme === 'light'
                          ? selectedBackgroundColor
                          : selected
                            ? textColor
                            : unselectedTextColor,
                      fontWeight: selected || isCurrentMonth ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, index) => {
          const selected = isSelected(date);
          const isToday = date.toDateString() === today.toDateString();
          return (
            <TouchableOpacity
              key={index}
              disabled={disabled}
              style={[
                styles.dateItem,
                {
                  backgroundColor: selected ? selectedBackgroundColor : unselectedBackgroundColor,
                  width: ITEM_WIDTH,
                  marginHorizontal: ITEM_SPACING,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: isToday ? selectedBackgroundColor : 'transparent',
                },
              ]}
              onPress={() => onDateChange(date)}
            >
              <Text style={[styles.dayName, { color: selected ? selectedTextColor : unselectedTextColor }]}>
                {getDayName(date)}
              </Text>
              <Text style={[styles.dayNumber, { color: selected ? selectedTextColor : unselectedTextColor }]}>
                {DayNumber(date)}
              </Text>
              {selected && <View style={styles.dot} />}
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
  },
  monthContainer: {
    marginBottom: 10,
    height: 40,
  },
  monthItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateItem: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
    marginTop: 4,
  },
});
