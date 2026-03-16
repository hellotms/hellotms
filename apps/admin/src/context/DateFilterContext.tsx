import React, { createContext, useContext, useState } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
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

  // Helper to get YYYY-MM-DD in local time
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
