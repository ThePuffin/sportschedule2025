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
}

export default function DateRangePicker({ onDateChange, dateRange }: Readonly<DateRangePickerProps>) {
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
    <div className="date-range-picker">
      <div className="date-picker-container">
        <DatePicker
          selected={startDate}
          onChange={handleStartDateChange}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          minDate={new Date()}
          placeholderText="Select start date"
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
          placeholderText="Select end date"
          className="custom-datepicker"
        />
      </div>
    </div>
  );
}
