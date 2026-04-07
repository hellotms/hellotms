import { Calendar } from 'lucide-react';
import { useDateFilter, type DatePreset } from '@/context/DateFilterContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useRef, useEffect } from 'react';

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: '1 Year', value: '365days' },
  { label: 'Custom', value: 'custom' },
];

export function DateRangePicker() {
  const { preset, range, setPreset, setCustomRange } = useDateFilter();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const handlePreset = (p: DatePreset) => {
    if (p === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      setPreset(p);
    }
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      setCustomRange({ from: new Date(customFrom), to: new Date(customTo) });
      setShowCustom(false);
    }
  };

  // Close popover on outside click
  useEffect(() => {
    if (!showCustom) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustom]);

  return (
    <div className="relative flex items-center gap-2">
      {/* Preset tabs */}
      <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 overflow-x-auto no-scrollbar">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={cn(
              'px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap',
              preset === p.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date badge */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5 border border-border whitespace-nowrap">
        <Calendar className="h-3 w-3 shrink-0" />
        <span>{format(range.from, 'dd MMM yyyy')} — {format(range.to, 'dd MMM yyyy')}</span>
      </div>

      {/* Custom date popover - floating */}
      {showCustom && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 z-50 bg-background border border-border rounded-xl p-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background w-[130px] outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background w-[130px] outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowCustom(false)}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyCustom}
                className="text-[11px] font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
