import React, { createContext, useContext, useState } from 'react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Dhaka';

export type DatePreset = 'today' | '7days' | '30days' | '365days' | 'custom';

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
    case '7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '365days':
      return { from: startOfDay(subDays(now, 364)), to: endOfDay(now) };
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

const DateFilterContext = createContext<DateFilterContextValue | undefined>(undefined);

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState<DatePreset>('30days');
  const [range, setRange] = useState<DateRange>(getPresetRange('30days'));

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
