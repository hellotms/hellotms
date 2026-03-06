import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Building2, FolderOpen, Receipt, Users,
  Globe, UserCog, Settings, LogOut, Menu, X, Bell, ChevronRight,
  MessageSquare, ClipboardList, Megaphone, Trash2, Sun, Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/notices', label: 'Notice Board', icon: Megaphone, permission: 'view_notices' },
  { to: '/companies', label: 'Companies', icon: Building2, permission: 'manage_companies' },
  { to: '/projects', label: 'Projects', icon: FolderOpen, permission: 'view_projects' },
  { to: '/invoices', label: 'Invoices', icon: Receipt, permission: 'manage_invoices' },
  { to: '/leads', label: 'Contact Form', icon: MessageSquare, permission: 'view_leads' },
  { to: '/staff', label: 'All Staff', icon: Users, permission: 'view_staff' },
  { to: '/settings', label: 'Profile Settings', icon: Settings },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, permission: 'manage_staff' },
  { to: '/work-logs', label: 'Activity Log', icon: ClipboardList, permission: 'view_audit_logs' },
  { to: '/cms', label: 'Core Settings', icon: Globe, permission: 'manage_cms' },
];

export default function AdminLayout() {
  const { profile, role, signOut, can } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Unread notices logic
  const lastSeenNoticesAt = localStorage.getItem(`last_seen_notices_${profile?.id}`) || new Date(0).toISOString();

  const { data: unreadNoticesCount = 0 } = useQuery({
    queryKey: ['unread-notices', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from('notices')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastSeenNoticesAt);
      return count ?? 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // Check every 30s
  });

  const handleOpenNotices = () => {
    localStorage.setItem(`last_seen_notices_${profile?.id}`, new Date().toISOString());
    navigate('/notices');
  };

  // Fetch site settings for logo and public URL
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings-layout'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('company_logo_url, public_site_url').eq('id', 1).single();
      return data;
    }
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn(
      'flex flex-col h-full bg-sidebar text-sidebar-foreground',
      mobile ? 'w-72' : 'w-64'
    )}>
      {/* User Identity - Top of Sidebar */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent transition-colors group"
        onClick={() => { navigate('/profile'); if (mobile) setSidebarOpen(false); }}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.name} className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-sm" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all shadow-sm">
            {getInitials(profile?.name ?? 'U')}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile?.name ?? 'User'}</p>
          <p className="text-[10px] text-sidebar-foreground/60 truncate capitalize font-medium">{role?.name?.replace('_', ' ') ?? 'Viewer'}</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-2 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.filter(item => {
          if (!item.permission) return true;
          if (role?.name === 'super_admin') return true;
          return can(item.permission);
        }).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-3 py-4 border-t border-sidebar-border mt-auto">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors group"
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-md hover:bg-muted transition-colors -ml-2"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5 md:gap-3">
              {siteSettings?.company_logo_url ? (
                <img src={siteSettings.company_logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover bg-muted/20" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-[10px]">MS</span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm md:text-base font-bold text-foreground leading-none truncate">The Marketing Solution</span>
                <span className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 truncate hidden sm:block uppercase tracking-wider font-medium">
                  {siteSettings?.public_site_url ? new URL(siteSettings.public_site_url).hostname : 'hellotms.com.bd'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {siteSettings?.public_site_url && (
              <a
                href={siteSettings.public_site_url}
                target="_blank"
                rel="noreferrer"
                title="View Public Website"
                className="p-2 rounded-md hover:bg-muted transition-colors relative text-muted-foreground mr-1"
              >
                <Globe className="h-5 w-5" />
              </a>
            )}

            <button
              onClick={handleOpenNotices}
              className="p-2 rounded-md hover:bg-muted transition-colors relative mr-2"
              title="Notice Board"
            >
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              {unreadNoticesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] flex items-center justify-center px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                  {unreadNoticesCount > 99 ? '99+' : unreadNoticesCount}
                </span>
              )}
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted transition-colors relative mr-1 text-muted-foreground"
              title="Toggle theme"
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
