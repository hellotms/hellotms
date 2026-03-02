import { cn, formatBDT } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  onClick?: () => void;
}

export function StatCard({
  title, value, isCurrency = false, delta, deltaLabel,
  icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10',
  onClick,
}: StatCardProps) {
  const displayValue = isCurrency
    ? formatBDT(typeof value === 'string' ? parseFloat(value) : value)
    : value;

  const isPositive = delta !== undefined && delta >= 0;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-5 flex flex-col gap-4',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {displayValue}
        </p>
        {delta !== undefined && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs font-medium',
            isPositive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {isPositive
              ? <TrendingUp className="h-3.5 w-3.5" />
              : <TrendingDown className="h-3.5 w-3.5" />
            }
            <span>{isPositive ? '+' : ''}{isCurrency ? formatBDT(Math.abs(delta)) : Math.abs(delta)}</span>
            {deltaLabel && <span className="text-muted-foreground font-normal">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
