import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Building2, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onBillingOpen: () => void;
  onProfileOpen: () => void;
  unreadCount?: number;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Portfolio', icon: FolderOpen },
  { to: '/companies', label: 'Companies', icon: Building2 },
];

export function MobileBottomNav({ onBillingOpen, onProfileOpen, unreadCount }: MobileBottomNavProps) {
  const location = useLocation();
  const isBillingActive = location.pathname.startsWith('/estimates') || location.pathname.startsWith('/invoices');
  const isProfileActive = location.pathname === '/profile';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <nav
        className="flex items-stretch bg-sidebar border-t border-sidebar-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Dashboard, Portfolio, Companies */}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center gap-1.5 py-3 relative transition-all min-h-[64px]',
              isActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'flex items-center justify-center rounded-2xl transition-all',
                  isActive
                    ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]'
                    : 'px-0 py-0'
                )}>
                  <Icon className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={cn(
                  'text-[10px] leading-none',
                  isActive ? 'font-bold text-primary' : 'font-medium'
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* Billing */}
        <button
          onClick={onBillingOpen}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1.5 py-3 relative transition-all min-h-[64px]',
            isBillingActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
          )}
        >
          <div className={cn(
            'flex items-center justify-center rounded-2xl transition-all',
            isBillingActive
              ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]'
              : 'px-0 py-0'
          )}>
            <FileText className="h-[20px] w-[20px]" strokeWidth={isBillingActive ? 2.5 : 1.8} />
          </div>
          <span className={cn(
            'text-[10px] leading-none',
            isBillingActive ? 'font-bold text-primary' : 'font-medium'
          )}>
            Billing
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={onProfileOpen}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1.5 py-3 relative transition-all min-h-[64px]',
            isProfileActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
          )}
        >
          <div className={cn(
            'flex items-center justify-center rounded-2xl transition-all relative',
            isProfileActive
              ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]'
              : 'px-0 py-0'
          )}>
            <User className="h-[20px] w-[20px]" strokeWidth={isProfileActive ? 2.5 : 1.8} />
            {(unreadCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-400 ring-2 ring-sidebar" />
            )}
          </div>
          <span className={cn(
            'text-[10px] leading-none',
            isProfileActive ? 'font-bold text-primary' : 'font-medium'
          )}>
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
}
