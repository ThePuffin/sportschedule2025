import { ThemedText } from '@/components/ThemedText';
import { useFavoriteColor } from '@/hooks/useFavoriteColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getDateRangeLimits } from '@/utils/dateRange';
import { DateRangePickerProps } from '@/utils/types';
import { brightenColor, translateWord } from '@/utils/utils';
import { Icon } from '@rneui/themed';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

/**
 * Imperative handle exposed via `ref` so parent components (e.g. the
 * magnifier button in `SliderDatePicker`) can open / close the calendar
 * dropdown of a `DateRangePicker` instance.
 */
export interface DatePickerHandle {
  open: () => void;
  close: () => void;
}

// Helper to format date to YYYY-MM-DD (local time)
const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to create local date from YYYY-MM-DD
const parseDateString = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const DateRangePicker = forwardRef<DatePickerHandle, Readonly<DateRangePickerProps>>(
  (
    {
      onDateChange,
      dateRange = { startDate: new Date(), endDate: new Date() },
      selectDate,
      readonly = false,
      showInput = true,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
  const [locale, setLocale] = useState('en-US');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textColor = useThemeColor({}, 'text');
  // Same palette as ThemedElements so the date picker matches the filter sections' background
  const backgroundColor = useThemeColor({ light: '#F0F0F0', dark: '#121212' }, 'background');
  const borderColor = useThemeColor({}, 'text');
  const textDisabledColor = useThemeColor({ light: '#d9e1e8', dark: '#444444' }, 'text');
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#000');
  const todayBrightColor = useMemo(() => brightenColor(selectedBackgroundColor, 90), [selectedBackgroundColor]);

  // Imperative handle so parents can open/close the calendar (e.g. the magnifier
  // button in SliderDatePicker opens this picker in single-date mode).
  useImperativeHandle(
    ref,
    (): DatePickerHandle => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
  );

  // Use date limits from the API/cache instead of hardcoded today
  const dateLimits = useMemo(() => getDateRangeLimits(), []);

  // Temporary state for current range selection
  const [tempRange, setTempRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language || 'en-US');
    }
  }, []);

  // Synchronize with props (range mode)
  useEffect(() => {
    if (!selectDate) {
      setTempRange({
        start: toDateString(dateRange.startDate),
        end: toDateString(dateRange.endDate),
      });
    }
  }, [dateRange, selectDate]);

  // Close calendar if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (globalThis.window !== undefined) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [wrapperRef]);

  const handleDayPress = (day: DateData) => {
    const dateStr = day.dateString;

    if (selectDate) {
      // Single date mode
      const date = parseDateString(dateStr);
      date.setHours(23, 59, 59, 999);
      onDateChange(date, date);
      setIsOpen(false);
    } else {
      // Date range mode
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
        // New selection (first click)
        setTempRange({ start: dateStr, end: null });
      } else {
        // End of selection (second click)
        let start = tempRange.start;
        let end = dateStr;

        // Invert if end is before start
        if (end < start) {
          [start, end] = [end, start];
        }

        setTempRange({ start, end });

        const startDate = parseDateString(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = parseDateString(end);
        endDate.setHours(23, 59, 59, 999);

        onDateChange(startDate, endDate);
        setIsOpen(false);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    const date = new Date(today);
    date.setHours(23, 59, 59, 999);
    onDateChange(date, date);
    setIsOpen(false);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const color = selectedBackgroundColor;
    const textColor = selectedTextColor;

    if (selectDate) {
      const dateStr = toDateString(selectDate);
      marked[dateStr] = { selected: true, color, textColor, startingDay: true, endingDay: true };
    } else {
      const { start, end } = tempRange;
      if (start) {
        marked[start] = { startingDay: true, color, textColor, selected: true };
        if (end) {
          marked[end] = { endingDay: true, color, textColor, selected: true };

          // Fill intermediate dates
          let curr = parseDateString(start);
          const last = parseDateString(end);
          curr.setDate(curr.getDate() + 1);

          while (curr < last) {
            const str = toDateString(curr);
            marked[str] = { color: '#f0f0f0', textColor: 'black', selected: true };
            curr.setDate(curr.getDate() + 1);
          }
        } else {
          // If only start is selected, mark as both start and end visually
          marked[start] = { startingDay: true, endingDay: true, color, textColor, selected: true };
        }
      }
    }
    return marked;
  };

  const displayText = () => {
    if (selectDate) {
      return selectDate.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    const start = dateRange.startDate;
    const end = dateRange.endDate;
    if (!start || !end) return 'Select range';
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(locale, opts)} - ${end.toLocaleDateString(locale, opts)}`;
  };

  const minDate = dateLimits.minDate;
  const maxDate = dateLimits.maxDate;

    return (
    <div ref={wrapperRef} style={{ position: 'relative', zIndex: 100, width: '100%' }}>
      {showInput && (
        <TouchableOpacity
          onPress={() => !readonly && setIsOpen(!isOpen)}
          disabled={readonly}
          style={[styles.inputContainer, { borderColor, backgroundColor }, readonly && styles.readonly]}
        >
          <Icon
            name="calendar"
            type="font-awesome"
            size={20}
            color={readonly ? 'gray' : textColor}
            style={{ marginRight: 10 }}
          />
          <ThemedText style={[styles.inputText, readonly && { color: 'gray' }]}>{displayText()}</ThemedText>
          {!readonly && (
            <Icon
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              type="font-awesome"
              size={12}
              color={textColor}
              style={{ marginLeft: 10 }}
            />
          )}
        </TouchableOpacity>
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: showInput ? '110%' : '0',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <View
            style={[
              styles.calendarContainer,
              {
                backgroundColor,
                width: Platform.OS === 'web' ? '90%' : 350,
                maxWidth: 350,
              },
            ]}
          >
            <Calendar
              style={{ width: '100%' }}
              onDayPress={handleDayPress}
              markingType={'period'}
              markedDates={getMarkedDates()}
              current={selectDate ? toDateString(selectDate) : toDateString(dateRange.startDate)}
              minDate={toDateString(minDate)}
              maxDate={toDateString(maxDate)}
              theme={{
                calendarBackground: backgroundColor,
                selectedDayBackgroundColor: selectedBackgroundColor,
                selectedDayTextColor: selectedTextColor,
                todayTextColor: textColor,
                todayBackgroundColor: todayBrightColor,
                dayTextColor: textColor,
                textDisabledColor,
                monthTextColor: textColor,
                arrowColor: textColor,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
              }}
            />
            {selectDate && (
              <TouchableOpacity
                onPress={goToToday}
                style={{
                  marginTop: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  backgroundColor: selectedBackgroundColor,
                  borderRadius: 8,
                  alignSelf: 'center',
                }}
              >
                <ThemedText
                  style={{
                    color: selectedTextColor,
                    fontWeight: 'bold',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  {translateWord('today')}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </div>
      )}
    </div>
  );
});

export default DateRangePicker;

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: 40,
    paddingHorizontal: 15,

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: { elevation: 2 },
      web: { boxShadow: 'none' },
    }),
    justifyContent: 'center',
    minWidth: 280,
    width: '100%',
  },
  readonly: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  inputText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    textTransform: 'capitalize',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0px 4px 4.65px rgba(0,0,0,0.3)' },
    }),
    padding: 10,
  },
});
