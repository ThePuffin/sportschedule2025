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
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
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
      onOpenChange,
      title,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
  // Month currently displayed in the calendar. `current` is a controlled prop on
  // react-native-calendars: without tracking it here, tapping the month arrows
  // snaps the calendar back to the initial month.
  const [visibleMonth, setVisibleMonth] = useState<string>(
    toDateString(selectDate ?? dateRange.startDate),
  );
  const [locale, setLocale] = useState('en-US');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textColor = useThemeColor({}, 'text');
  // Same palette as ThemedElements so the date picker matches the filter sections' background
  const backgroundColor = useThemeColor({ light: '#F0F0F0', dark: '#121212' }, 'background');
  const borderColor = useThemeColor({}, 'text');
  const textDisabledColor = useThemeColor({ light: '#d9e1e8', dark: '#444444' }, 'text');
  const { backgroundColor: selectedBackgroundColor, textColor: selectedTextColor } = useFavoriteColor('#000');
  const todayBrightColor = useMemo(() => brightenColor(selectedBackgroundColor, 90), [selectedBackgroundColor]);

  // Modal title: use the explicit `title` prop when provided (so the modal matches
  // the accordion/filter label on the parent page), otherwise derive it from the mode:
  // single-date → "Filter by period", range → "Filter by interval".
  const modalTitle = title ?? (selectDate
    ? translateWord('selectYourDates')
    : translateWord('filterInterval'));

  // Imperative handle so parents can open/close the calendar (e.g. the magnifier
  // button in SliderDatePicker opens this picker in single-date mode).
  useImperativeHandle(
    ref,
    (): DatePickerHandle => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
  );

// Notify the parent whenever the calendar opens/closes so it can sync its UI
  // (e.g. switch the magnifier button to a close icon), including when the calendar
  // is closed by selecting a date or clicking outside.
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Delay the visual appearance of the modal so the parent has time to hide
  // the separator (or any other UI sync) before the modal fades in.
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowModal(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  // When the calendar opens, start on the month of the selected date / range start
  // and re-sync the staged range from the committed props: any previous unvalidated
  // staging is discarded, so closing without validating keeps the old selection.
  useEffect(() => {
    if (isOpen) {
      setVisibleMonth(toDateString(selectDate ?? dateRange.startDate));
      if (!selectDate) {
        setTempRange({
          start: toDateString(dateRange.startDate),
          end: toDateString(dateRange.endDate),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
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
      // Date range mode — selection is only *staged* in tempRange. It is committed
      // to the parent via onDateChange when the user presses the "Validate" button.
      // Closing the modal any other way (backdrop, X, outside click) keeps the
      // previous selection (tempRange is re-synced from props on next open).
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
      }
    }
  };

  // Commit the staged range selection and close the modal. Only reachable in
  // range mode (the "Validate" footer button), and only once both bounds exist.
  const handleValidateRange = () => {
    if (tempRange.start && tempRange.end) {
      const startDate = parseDateString(tempRange.start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = parseDateString(tempRange.end);
      endDate.setHours(23, 59, 59, 999);

      onDateChange(startDate, endDate);
      setIsOpen(false);
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

  // Calendar card reused by both the web overlay and the native Modal
  const calendarCard = (
    <View
      style={[
        styles.modalContent,
        {
          backgroundColor,
          width: Platform.OS === 'web' ? '90%' : '90%',
          maxWidth: 400,
        },
      ]}
    >
      {/* Header: title + close button, same pattern as Selector modal */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>{modalTitle}</Text>
        <TouchableOpacity
          style={{ padding: 5 } as any}
          onPress={() => setIsOpen(false)}
        >
          <Icon name="close" type="font-awesome" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Scrollable calendar content with fixed max height */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Calendar
          style={{ width: '100%' }}
          onDayPress={handleDayPress}
          markingType={'period'}
          markedDates={getMarkedDates()}
          current={visibleMonth}
          onMonthChange={(month: DateData) => setVisibleMonth(toDateString(new Date(month.year, month.month - 1, 1)))}
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
      </ScrollView>

      {/* Footer — always rendered so there's a little breathing room at the bottom
          (10px empty buffer in range mode, e.g. schedule tab). In single-date mode it
          also holds the "Aujourd'hui" quick-return button. Kept OUTSIDE the scroll
          area so it never disappears when the calendar is taller than the scroll height. */}
      <View style={styles.footer}>
        {selectDate ? (
          <TouchableOpacity
            onPress={goToToday}
            style={{
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
        ) : (
          // Range mode: staged selection is only committed when the user presses
          // "Validate". Disabled until both bounds of the range are picked.
          <TouchableOpacity
            onPress={handleValidateRange}
            disabled={!tempRange.start || !tempRange.end}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: tempRange.start && tempRange.end ? selectedBackgroundColor : textDisabledColor,
              borderRadius: 8,
              alignSelf: 'center',
              opacity: tempRange.start && tempRange.end ? 1 : 0.5,
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
              {translateWord('validate')}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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

      {/* WEB: position:fixed overlay (Modal is unreliable on react-native-web).
          The dimmed backdrop is a SIBLING layer *behind* the card (not its parent),
          so taps inside the calendar (days, month arrows) can never bubble up to
          the backdrop and accidentally close the modal. */}
      {showModal && Platform.OS === 'web' && (
        <View
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 60,
            animation: 'datepickerFadeIn 200ms ease-in-out',
          } as any}
        >
          {/* Backdrop press-catcher (behind the card) */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
            style={StyleSheet.absoluteFill as any}
          />
          {/* Card — separate layer above the backdrop (relative + zIndex so it
              paints above the absolutely-positioned backdrop on web too) */}
          <View style={{ position: 'relative', zIndex: 1, width: '100%', alignItems: 'center' }}>{calendarCard}</View>
        </View>
      )}
      {/* NATIVE: transparent Modal — top-aligned so content is always visible.
          Same sibling-backdrop structure as web (see above). */}
      {Platform.OS !== 'web' && (
        <Modal
          transparent
          animationType="fade"
          visible={showModal}
          onRequestClose={() => setIsOpen(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: 80,
            }}
          >
            {/* Backdrop press-catcher (behind the card) */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setIsOpen(false)}
              style={StyleSheet.absoluteFill as any}
            />
            {/* Card — separate layer above the backdrop */}
            <View style={{ position: 'relative', zIndex: 1, width: '100%', alignItems: 'center' }}>{calendarCard}</View>
          </View>
        </Modal>
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
  // Datepicker modal card container — matches the Selector (team/league filter) modal
  // so the same modal pattern is used on the index page.
  modalContent: {
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
  },
  // Header row: title (left) + close (X) button (right)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Scrollable calendar area with a bounded height so it stays on screen regardless
  // of the page height (mirrors the Selector's fixed-height scroll).
  scrollContent: {
    maxHeight: 400,
  },
  scrollContentContainer: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  // Footer shown below the scroll area. Always rendered: in single-date mode it hosts
  // the "Aujourd'hui" button; in range mode it acts as an empty ~10px bottom buffer.
  // Kept outside the ScrollView so it stays visible even when the calendar fills the
  // scroll height, and so the modal always has a little border/breathing room at the bottom.
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
});
