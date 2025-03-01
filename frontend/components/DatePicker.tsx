import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './css/DatePicker.css';
import { addDays } from '../utils/date';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  onDateChange: (startDate: Date, endDate: Date) => void;
  dateRange: DateRange;
  noEnd: boolean;
}

export default function DateRangePicker({ onDateChange, dateRange, noEnd }: Readonly<DateRangePickerProps>) {
  const now = new Date();
  const inOneYear = now.setFullYear(now.getFullYear() + 1);
  let { startDate: start, endDate: end } = dateRange;

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const handleStartDateChange = (date: Date) => {
    let end = endDate;
    if (new Date(endDate) < new Date(date)) {
      end = addDays(date, 1);
      setEndDate(end);
    }
    setStartDate(date);
    onDateChange(date, end);
  };

  const handleEndDateChange = (date: Date) => {
    let start = startDate;
    if (new Date(date) < new Date(startDate)) {
      start = addDays(date, 0);
      setStartDate(start);
    }
    setEndDate(date);
    onDateChange(start, date);
  };

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
              className="custom-datepicker"
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
              className="custom-datepicker"
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
              className="custom-datepicker"
            />
          </div>
        </div>
      )}
    </>
  );
}
