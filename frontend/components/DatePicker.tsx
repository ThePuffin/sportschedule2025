import { DateRangePickerProps } from '@/utils/types';
import { Icon } from '@rneui/themed';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

// Helper pour formater la date en YYYY-MM-DD (heure locale)
const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper pour créer une date locale depuis YYYY-MM-DD
const parseDateString = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function DateRangePicker({
  onDateChange,
  dateRange = { startDate: new Date(), endDate: new Date() },
  selectDate,
  readonly = false,
}: Readonly<DateRangePickerProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [locale, setLocale] = useState('en-US');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // État temporaire pour la sélection de plage en cours
  const [tempRange, setTempRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setLocale(navigator.language || 'en-US');
    }
  }, []);

  // Synchronisation avec les props
  useEffect(() => {
    if (!selectDate) {
      setTempRange({
        start: toDateString(dateRange.startDate),
        end: toDateString(dateRange.endDate),
      });
    }
  }, [dateRange, selectDate]);

  // Fermer le calendrier si on clique en dehors
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
      // Mode date unique
      const date = parseDateString(dateStr);
      date.setHours(23, 59, 59, 999);
      onDateChange(date, date);
      setIsOpen(false);
    } else {
      // Mode plage de dates
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
        // Nouvelle sélection (premier clic)
        setTempRange({ start: dateStr, end: null });
      } else {
        // Fin de sélection (deuxième clic)
        let start = tempRange.start;
        let end = dateStr;

        // Inverser si la fin est avant le début
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

  const getMarkedDates = () => {
    const marked: any = {};
    const color = 'black';
    const textColor = 'white';

    if (selectDate) {
      const dateStr = toDateString(selectDate);
      marked[dateStr] = { selected: true, color, textColor };
    } else {
      const { start, end } = tempRange;
      if (start) {
        marked[start] = { startingDay: true, color, textColor, selected: true };
        if (end) {
          marked[end] = { endingDay: true, color, textColor, selected: true };

          // Remplir les dates intermédiaires
          let curr = parseDateString(start);
          const last = parseDateString(end);
          curr.setDate(curr.getDate() + 1);

          while (curr < last) {
            const str = toDateString(curr);
            marked[str] = { color: '#f0f0f0', textColor: 'black', selected: true };
            curr.setDate(curr.getDate() + 1);
          }
        } else {
          // Si seul le début est sélectionné, on le marque comme début et fin visuellement
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

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(minDate.getFullYear() + 1);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', zIndex: 100, width: '100%', margin: '10px 0' }}>
      <TouchableOpacity
        onPress={() => !readonly && setIsOpen(!isOpen)}
        disabled={readonly}
        style={[styles.inputContainer, readonly && styles.readonly]}
      >
        <Icon
          name="calendar"
          type="font-awesome"
          size={20}
          color={readonly ? 'gray' : 'black'}
          style={{ marginRight: 10 }}
        />
        <Text style={[styles.inputText, readonly && { color: 'gray' }]}>{displayText()}</Text>
        {!readonly && (
          <Icon
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            type="font-awesome"
            size={12}
            color="gray"
            style={{ marginLeft: 10 }}
          />
        )}
      </TouchableOpacity>

      {isOpen && (
        <div style={{ position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              markingType={'period'}
              markedDates={getMarkedDates()}
              current={selectDate ? toDateString(selectDate) : toDateString(dateRange.startDate)}
              minDate={toDateString(minDate)}
              maxDate={toDateString(maxDate)}
              theme={{
                selectedDayBackgroundColor: 'black',
                selectedDayTextColor: 'white',
                todayTextColor: 'black',
                arrowColor: 'black',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
              }}
            />
          </View>
        </div>
      )}
    </div>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    justifyContent: 'center',
    minWidth: 280,
    width: '100%',
  },
  readonly: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  inputText: {
    fontSize: 16,
    color: 'black',
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    padding: 10,
    width: 350,
  },
});
