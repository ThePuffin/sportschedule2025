import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './css/DatePicker.css';

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
  const { startDate: start, endDate: end } = dateRange;

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    onDateChange(date, endDate);
  };

  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
    onDateChange(startDate, date);
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
