import { DateRangePickerProps } from '@/utils/types';
import { en, fr } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addDays } from '../utils/date';
import './css/DatePicker.css';

export default function DateRangePicker({ onDateChange, dateRange, noEnd }: Readonly<DateRangePickerProps>) {
  const now = new Date();
  const inOneYear = now.setFullYear(now.getFullYear() + 1);
  let { startDate: start, endDate: end } = dateRange;

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [locale, setLocale] = useState<'en' | 'fr'>('en');

  const handleStartDateChange = (date: Date) => {
    let end = endDate;
    if (new Date(endDate) < new Date(date)) {
      end = new Date(addDays(date, 1));
      end.setHours(23, 59, 59, 999);
      setEndDate(end);
    }
    date.setHours(23, 59, 59, 999);
    setStartDate(date);
    onDateChange(date, end);
  };

  const handleEndDateChange = (date: Date) => {
    let start = startDate;
    if (new Date(date) < new Date(startDate)) {
      start = new Date(addDays(date, 0));
      start.setHours(23, 59, 59, 999);
      setStartDate(start);
    }
    date.setHours(23, 59, 59, 999);
    setEndDate(date);
    onDateChange(start, date);
  };

  useEffect(() => {
    const userLocale = navigator.language || '';
    userLocale === 'fr-FR' ? registerLocale('fr', fr) : registerLocale('en', en);
    setLocale(userLocale === 'fr-FR' ? 'fr' : 'en');
  }, []);

  return (
    <>
      {!noEnd && (
        <div className="date-range-picker">
          <div className="date-picker-container">
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              minDate={new Date()}
              maxDate={now}
              locale={locale}
              className="custom-datepicker"
              dateFormat={locale === 'fr' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
            />
          </div>
          <div className="date-picker-container">
            <DatePicker
              selected={endDate}
              onChange={handleEndDateChange}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              locale={locale}
              className="custom-datepicker"
              dateFormat={locale === 'fr' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
            />
          </div>
        </div>
      )}
      {noEnd && (
        <div className="date-range-picker">
          <div className="date-picker-container">
            <DatePicker
              selected={startDate}
              onChange={handleStartDateChange}
              minDate={new Date()}
              maxDate={inOneYear}
              locale={locale}
              className="custom-datepicker"
              dateFormat={locale === 'fr' ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
            />
          </div>
        </div>
      )}
    </>
  );
}
