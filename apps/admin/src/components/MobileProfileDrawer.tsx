import { useNavigate } from 'react-router-dom';
import { cn, getInitials } from '@/lib/utils';
import {
  X, UserCog, MessageSquare, Megaphone, Users, Trash2,
  ClipboardList, Globe, Download, LogOut, ChevronRight, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface MobileProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  role: any;
  can: (permission: string) => boolean;
  handleSignOut: () => void;
  hasUpdate?: boolean;
  onApplyUpdate?: () => void;
  isUpdating?: boolean;
  appVersion?: string;
}

const drawerNavItems = [
  { to: '/leads', label: 'Contact Form', icon: MessageSquare, permission: 'view_leads' },
  { to: '/notices', label: 'Notice Board', icon: Megaphone, permission: 'view_notices' },
  { to: '/staff', label: 'All Staff', icon: Users, permission: 'view_staff' },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, permission: 'manage_staff' },
  { to: '/work-logs', label: 'Activity Log', icon: ClipboardList, permission: 'view_audit_logs' },
  { to: '/cms', label: 'Core Settings', icon: Globe, permission: 'manage_cms' },
  { to: '/download-app', label: 'Download App', icon: Download },
];

export function MobileProfileDrawer({
  isOpen, onClose, profile, role, can, handleSignOut,
  hasUpdate, onApplyUpdate, isUpdating, appVersion
}: MobileProfileDrawerProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const filteredItems = drawerNavItems.filter(item => {
    if (!item.permission) return true;
    if (role?.name === 'super_admin') return true;
    return can(item.permission);
  });

  return (
    <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer from bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header with close */}
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profile Menu</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-8">
          {/* Profile card */}
          <button
            onClick={() => goTo('/profile')}
            className="w-full flex items-center gap-3.5 px-5 py-4 border-y border-border hover:bg-muted/50 transition-colors group"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 shadow-sm" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white ring-2 ring-primary/20 shadow-sm">
                {getInitials(profile?.name ?? 'U')}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{profile?.name ?? 'User'}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{role?.name?.replace('_', ' ') ?? 'Viewer'}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
              My Profile
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Theme toggle */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Dark Mode</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                theme === 'dark' ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center",
                theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'
              )}>
                {theme === 'dark' ? <Moon className="h-3 w-3 text-primary" /> : <Sun className="h-3 w-3 text-amber-500" />}
              </span>
            </button>
          </div>

          {/* Nav items */}
          <div className="px-3 py-2 space-y-0.5">
            {filteredItems.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => goTo(to)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted/60 hover:text-foreground transition-all active:scale-[0.98] group"
              >
                <Icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 text-left">{label}</span>
                {label === 'Download App' && hasUpdate && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
              </button>
            ))}
          </div>

          {/* Update Banner */}
          {hasUpdate && onApplyUpdate && (
            <div className="px-5 py-2">
              <button
                onClick={onApplyUpdate}
                disabled={isUpdating}
                className="w-full px-3 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isUpdating ? 'Updating...' : 'Update Available!'}
              </button>
            </div>
          )}

          {/* App version */}
          <div className="px-5 py-2">
            <div className="px-3 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              <span>App Version</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">v{appVersion || '0.1.3'}</span>
            </div>
          </div>

          {/* Sign out */}
          <div className="px-5 py-2">
            <button
              onClick={() => { handleSignOut(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-[0.98]"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
