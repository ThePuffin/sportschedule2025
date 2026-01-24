import { useThemeColor } from '@/hooks/useThemeColor';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

interface SliderDatePickerProps {
  selectDate: Date;
  onDateChange: (date: Date) => void;
}

export default function SliderDatePicker({ selectDate, onDateChange }: SliderDatePickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const monthScrollViewRef = useRef<ScrollView>(null);
  const [dates, setDates] = useState<Date[]>([]);
  const [months, setMonths] = useState<Date[]>([]);
  const [locale, setLocale] = useState('en-US');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Custom colors to match the screenshot
  const selectedBackgroundColor = '#3b82f6'; // Bright Blue
  const unselectedBackgroundColor = 'rgba(120, 120, 120, 0.1)'; // Subtle dark grey for unselected
  const unselectedTextColor = '#8E8E93';
  const selectedTextColor = '#FFFFFF';

  const ITEM_WIDTH = 55;
  const ITEM_SPACING = 8;
  const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_SPACING * 2;
  const MONTH_ITEM_WIDTH = 150;
  const { width: windowWidth } = useWindowDimensions();
  const today = new Date();

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language || 'en-US');
    }
  }, []);

  useEffect(() => {
    const startOfMonth = new Date(selectDate.getFullYear(), selectDate.getMonth(), 1);
    const isMonthInCurrentRange =
      months.length > 0 && months[0] <= startOfMonth && months[months.length - 1] >= startOfMonth;

    if (!isMonthInCurrentRange) {
      const newMonths: Date[] = [];
      for (let i = -6; i <= 6; i++) {
        const d = new Date(startOfMonth);
        d.setMonth(startOfMonth.getMonth() + i);
        newMonths.push(d);
      }
      setMonths(newMonths);
    }
  }, [selectDate]);

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
    const isDateInCurrentRange = dates.length > 0 && dates[0] <= selectDate && dates[dates.length - 1] >= selectDate;

    if (!isDateInCurrentRange) {
      const baseDate = new Date(selectDate);
      const newDates: Date[] = [];
      for (let i = -30; i <= 30; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        newDates.push(d);
      }
      setDates(newDates);
    }
  }, [selectDate]);

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
    onDateChange(newDate);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
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
                key={index}
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
                      color: selected ? textColor : unselectedTextColor,
                      fontWeight: selected || isCurrentMonth ? 'bold' : 'normal',
                      opacity: selected || isCurrentMonth ? 1 : 0.6,
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
              <Text style={[styles.dayNumber, { color: selected ? selectedTextColor : textColor }]}>
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
