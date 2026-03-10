import { Calendar } from 'lucide-react';
import { useDateFilter, type DatePreset } from '@/context/DateFilterContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
];

export function DateRangePicker() {
  const { preset, range, setPreset, setCustomRange } = useDateFilter();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              preset === p.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-1.5 border border-border">
        <Calendar className="h-3.5 w-3.5" />
        <span>{format(range.from, 'dd MMM yyyy')} — {format(range.to, 'dd MMM yyyy')}</span>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2 shadow-md">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          />
          <button
            onClick={applyCustom}
            className="text-xs bg-primary text-white px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={() => setShowCustom(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
