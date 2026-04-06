import React, { createContext, useContext, useState } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Dhaka';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterContextValue {
  preset: DatePreset;
  range: DateRange;
  setPreset: (preset: DatePreset) => void;
  setCustomRange: (range: DateRange) => void;
  fromISO: string;
  toISO: string;
}

function getPresetRange(preset: DatePreset): DateRange {
  // Get current time in Asia/Dhaka
  const now = toZonedTime(new Date(), TIMEZONE);
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      // weekStartsOn: 6 is Saturday
      return { from: startOfWeek(now, { weekStartsOn: 6 }), to: endOfWeek(now, { weekStartsOn: 6 }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

const DateFilterContext = createContext<DateFilterContextValue | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<DatePreset>('month');
  const [range, setRange] = useState<DateRange>(getPresetRange('month'));

  const setPreset = (p: DatePreset) => {
    setPresetState(p);
    if (p !== 'custom') setRange(getPresetRange(p));
  };

  const setCustomRange = (r: DateRange) => {
    setPresetState('custom');
    setRange(r);
  };

  // Helper to get YYYY-MM-DD in Asia/Dhaka
  const toLocalDateString = (date: Date) => {
    return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
  };

  const fromISO = toLocalDateString(range.from);
  const toISO = toLocalDateString(range.to);

  return (
    <DateFilterContext.Provider value={{ preset, range, setPreset, setCustomRange, fromISO, toISO }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error('useDateFilter must be used within DateFilterProvider');
  return ctx;
}
