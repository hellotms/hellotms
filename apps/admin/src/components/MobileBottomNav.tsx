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
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[56px]',
              isActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-primary" />
                )}
                <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={cn(
                  'text-[9px] leading-none',
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
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[56px]',
            isBillingActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
          )}
        >
          {isBillingActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-primary" />
          )}
          <FileText className="h-[18px] w-[18px]" strokeWidth={isBillingActive ? 2.5 : 1.8} />
          <span className={cn(
            'text-[9px] leading-none',
            isBillingActive ? 'font-bold text-primary' : 'font-medium'
          )}>
            Billing
          </span>
        </button>

        {/* Profile */}
        <button
          onClick={onProfileOpen}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[56px]',
            isProfileActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
          )}
        >
          {isProfileActive && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-full bg-primary" />
          )}
          <User className="h-[18px] w-[18px]" strokeWidth={isProfileActive ? 2.5 : 1.8} />
          <span className={cn(
            'text-[9px] leading-none',
            isProfileActive ? 'font-bold text-primary' : 'font-medium'
          )}>
            Profile
          </span>
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-red-400 ring-2 ring-sidebar" />
          )}
        </button>
      </nav>
    </div>
  );
}
