import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Building2, FolderOpen, Receipt, Users,
  Globe, UserCog, Settings, LogOut, Menu, X, Bell, ChevronRight,
  MessageSquare, ClipboardList, Megaphone, Trash2, Sun, Moon, FileText, Download, RotateCw
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import IdleScreen from '@/components/IdleScreen';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Controller } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import packageJson from '../../package.json';
import { toast } from '../components/Toast';

// Add Tauri open capability if running in desktop app
let openExternal: ((url: string) => Promise<void>) | null = null;
let getAppVersion: (() => Promise<string>) | null = null;
let checkAppUpdate: (() => Promise<any>) | null = null;

if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  import('@tauri-apps/api/app').then(m => {
    getAppVersion = m.getVersion;
  });
  import('@tauri-apps/plugin-opener').then(m => {
    openExternal = m.openUrl;
  });
  import('@tauri-apps/plugin-updater').then(m => {
    checkAppUpdate = m.check;
  });
}

const getNavItems = (
  lastIds: { project: string | null, invoice: string | null, estimate: string | null },
  currentPath: string
) => {
  const isProjectsActive = currentPath.startsWith('/projects');
  const isInvoicesActive = currentPath.startsWith('/invoices');
  const isEstimatesActive = currentPath.startsWith('/estimates');

  return [
    { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: isProjectsActive ? '/projects' : (lastIds.project ? `/projects/${lastIds.project}` : '/projects'), label: 'Business Portfolio', icon: FolderOpen, permission: 'view_projects' },
    { to: '/companies', label: 'Companies', icon: Building2, permission: 'manage_companies' },
    { to: isEstimatesActive ? '/estimates' : (lastIds.estimate ? `/estimates/${lastIds.estimate}` : '/estimates'), label: 'Estimates', icon: FileText, permission: 'manage_invoices' },
    { to: isInvoicesActive ? '/invoices' : (lastIds.invoice ? `/invoices/${lastIds.invoice}` : '/invoices'), label: 'Invoices', icon: Receipt, permission: 'manage_invoices' },
    { to: '/leads', label: 'Contact Form', icon: MessageSquare, permission: 'view_leads' },
  { to: '/notices', label: 'Notice Board', icon: Megaphone, permission: 'view_notices' },
  { to: '/staff', label: 'All Staff', icon: Users, permission: 'view_staff' },
  { to: '/profile', label: 'My Profile', icon: UserCog },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, permission: 'manage_staff' },
  { to: '/work-logs', label: 'Activity Log', icon: ClipboardList, permission: 'view_audit_logs' },
  { to: '/cms', label: 'Core Settings', icon: Globe, permission: 'manage_cms' },
  { to: '/download-app', label: 'Download App', icon: Download },
  ];
};

interface SidebarProps {
  mobile?: boolean;
  profile: any;
  role: any;
  setSidebarOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  handleSignOut: () => void;
  can: (permission: string) => boolean;
  hasUpdate?: boolean;
  onApplyUpdate?: () => void;
  isUpdating?: boolean;
  appVersion?: string;
  lastIds?: { project: string | null, invoice: string | null, estimate: string | null };
}

const Sidebar = ({ mobile = false, profile, role, setSidebarOpen, navigate, handleSignOut, can, hasUpdate, onApplyUpdate, isUpdating, appVersion, lastIds }: SidebarProps) => {
  const location = useLocation();
  const navItems = getNavItems(lastIds ?? { project: null, invoice: null, estimate: null }, location.pathname);
  return (
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
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
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
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group relative',
            isActive
              ? 'bg-primary/15 text-primary border border-primary/25 backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.05)]'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          {({ isActive }) => (
            <>
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "scale-110" : "opacity-70")} />
              <span className="flex-1">{label}</span>
              {label === 'Download App' && hasUpdate && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse" />
              )}
              {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    {/* Update Banner + Version & Sign Out */}
    <div className="px-3 py-4 border-t border-sidebar-border mt-auto space-y-2">
      {hasUpdate && onApplyUpdate && (
        <button
          onClick={onApplyUpdate}
          disabled={isUpdating}
          className="w-full px-3 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 animate-pulse"
        >
          <Download className="h-4 w-4" />
          {isUpdating ? 'Updating...' : 'Update Available!'}
        </button>
      )}
      <div className="px-3 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sidebar-foreground/40">
        <span>App Version</span>
        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">v{appVersion}</span>
      </div>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all group"
      >
        <LogOut className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span>Sign out</span>
      </button>
    </div>
  </div>
  );
};

export default function AdminLayout() {
  const { profile, role, signOut, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [appVersion, setAppVersion] = useState<string>(packageJson.version);

  // Persistent Navigation Logic
  const lastProjectId = localStorage.getItem('last_project_id');
  const lastInvoiceId = localStorage.getItem('last_invoice_id');
  const lastEstimateId = localStorage.getItem('last_estimate_id');
  const lastCompanyId = localStorage.getItem('last_company_id');
  
  const lastIds = {
    project: lastProjectId,
    invoice: lastInvoiceId,
    estimate: lastEstimateId,
    company: lastCompanyId
  };

  useEffect(() => {
    // Capture IDs from URL or clear them if on the list root
    if (location.pathname.startsWith('/projects')) {
       const match = location.pathname.match(/^\/projects\/([a-f0-9-]+)/i);
       if (match && match[1]) {
           localStorage.setItem('last_project_id', match[1]);
       } else if (location.pathname === '/projects') {
           localStorage.removeItem('last_project_id');
       }
    }

    if (location.pathname.startsWith('/invoices')) {
       const match = location.pathname.match(/^\/invoices\/([a-f0-9-]+)/i);
       if (match && match[1]) {
           localStorage.setItem('last_invoice_id', match[1]);
       } else if (location.pathname === '/invoices') {
           localStorage.removeItem('last_invoice_id');
       }
    }

    if (location.pathname.startsWith('/estimates')) {
       const match = location.pathname.match(/^\/estimates\/([a-f0-9-]+)/i);
       if (match && match[1]) {
           localStorage.setItem('last_estimate_id', match[1]);
       } else if (location.pathname === '/estimates') {
           localStorage.removeItem('last_estimate_id');
       }
    }

    if (location.pathname.startsWith('/companies')) {
       const match = location.pathname.match(/^\/companies\/([a-f0-9-]+)/i);
       if (match && match[1]) {
           localStorage.setItem('last_company_id', match[1]);
       } else if (location.pathname === '/companies') {
           localStorage.removeItem('last_company_id');
       }
    }
  }, [location.pathname]);

  // Check for updates (PC Apps only - Native Updater)
  useEffect(() => {
    if (getAppVersion) {
      getAppVersion().then(v => setAppVersion(v));
    }

    if (!checkAppUpdate) return;

    const runUpdater = async () => {
      try {
        const update = await checkAppUpdate!();
        if (update) {
          setHasUpdate(true);
          setUpdateInfo(update);
        }
      } catch (err) {
        console.warn('[NativeUpdater] Check failed:', err);
      }
    };

    runUpdater();
  }, []);

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;
    try {
      setIsUpdating(true);
      toast('Downloading update...', 'info');
      await updateInfo.downloadAndInstall();
      toast('Update installed! Restarting...', 'success');

      // Request relaunch to apply update immediately
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err: any) {
      console.error('[NativeUpdater] Apply failed:', err);
      toast(`Update failed: ${err.message || JSON.stringify(err) || err}`, 'error');
      setIsUpdating(false);
    }
  };

  // --- IDLE LOGIC ---
  const IDLE_TIMEOUT = 30000; // 30 seconds
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (isIdle) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    if (!profile) return;
    resetIdleTimer();
    const events = ['mousemove', 'keydown', 'wheel', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();
    events.forEach(eventName => window.addEventListener(eventName, handleActivity, { passive: true }));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(eventName => window.removeEventListener(eventName, handleActivity));
    };
  }, [profile, isIdle]);

  const handleContinueSession = () => {
    setIsIdle(false);
    resetIdleTimer();
  };
  // ------------------

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
      const { data } = await supabase.from('site_settings').select('company_logo_url, public_site_url, site_motto, hero_slider').eq('id', 1).single();
      return data;
    }
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    // Keep spinning for at least 600ms for visual feedback
    setTimeout(() => setRefreshing(false), 600);
  };

  // Route to index mapping for Swiper
  const getRouteIndex = (path: string) => {
    if (path.startsWith('/dashboard')) return 0;
    if (path.startsWith('/projects')) return 1;
    if (path.startsWith('/companies')) return 2;
    if (path.startsWith('/estimates') || path.startsWith('/invoices') || path === '/mobile-billing') return 3;
    if (path.startsWith('/mobile-menu')) return 4;
    return -1;
  };

  const [swiper, setSwiper] = useState<SwiperClass | null>(null);
  const activeIndex = getRouteIndex(location.pathname);
  const mobileRoutes = ['/dashboard', '/projects', '/companies', '/mobile-billing', '/mobile-menu'];
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync Slider with URL
  useEffect(() => {
    if (swiper && activeIndex !== -1 && swiper.activeIndex !== activeIndex) {
      swiper.slideTo(activeIndex);
    }
  }, [location.pathname, swiper, activeIndex]);

  const handleSlideChange = (s: SwiperClass) => {
    const newIdx = s.activeIndex;
    if (newIdx === activeIndex) return;
    
    const targetPath = mobileRoutes[newIdx];
    if (targetPath) {
      navigate(getIntelPath(targetPath));
    }
  };

  const getIntelPath = (route: string) => {
    if (route === '/projects') {
      const id = localStorage.getItem('last_project_id');
      return id ? `/projects/${id}` : '/projects';
    }
    if (route === '/companies') {
      const id = localStorage.getItem('last_company_id');
      return id ? `/companies/${id}` : '/companies';
    }
    return route;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {isIdle && (
        <IdleScreen
          heroSlider={siteSettings?.hero_slider || []}
          onContinue={handleContinueSession}
          onSignOut={handleSignOut}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border/60 shrink-0 z-10 relative">
        <Sidebar
          profile={profile}
          role={role}
          setSidebarOpen={setSidebarOpen}
          navigate={navigate}
          handleSignOut={handleSignOut}
          can={can}
          hasUpdate={hasUpdate}
          onApplyUpdate={handleApplyUpdate}
          isUpdating={isUpdating}
          appVersion={appVersion}
          lastIds={lastIds}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar
              mobile
              profile={profile}
              role={role}
              setSidebarOpen={setSidebarOpen}
              navigate={navigate}
              handleSignOut={handleSignOut}
              can={can}
              hasUpdate={hasUpdate}
              onApplyUpdate={handleApplyUpdate}
              isUpdating={isUpdating}
              appVersion={appVersion}
              lastIds={lastIds}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center justify-between px-2 sm:px-4 md:px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">

            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
              <div className="relative group shrink-0">
                {siteSettings?.company_logo_url ? (
                  <img src={siteSettings.company_logo_url} alt="Logo" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl object-cover bg-muted/20 shadow-sm" />
                ) : (
                  <div className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover:scale-105 transition-transform">
                    <span className="text-primary font-black text-[10px] tracking-tighter">TMS</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-['Lato'] text-[17px] sm:text-base md:text-[18px] font-bold text-foreground leading-none truncate grow">The Marketing Solution</span>
                  <span className="hidden xs:inline-block px-1.5 py-0.5 bg-primary/5 text-primary text-[7px] font-bold uppercase tracking-widest rounded-md border border-primary/10 shrink-0">Inside</span>
                </div>
                <span className="text-[10px] sm:text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-widest font-bold opacity-70">
                  {siteSettings?.site_motto || 'Innovate . Engage . Grow'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {siteSettings?.public_site_url && (
              <a
                href={siteSettings.public_site_url}
                onClick={async (e) => {
                  if (openExternal) {
                    e.preventDefault();
                    await openExternal(siteSettings.public_site_url);
                  }
                }}
                target="_blank"
                rel="noreferrer"
                title="View Public Website"
                className="flex p-2 rounded-md hover:bg-muted transition-colors relative text-muted-foreground"
              >
                <Globe className="h-5 w-5" />
              </a>
            )}

            <button
              onClick={handleOpenNotices}
              className="hidden sm:flex p-2 rounded-md hover:bg-muted transition-colors relative"
              title="Notice Board"
            >
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              {unreadNoticesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] flex items-center justify-center px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                  {unreadNoticesCount > 99 ? '99+' : unreadNoticesCount}
                </span>
              )}
            </button>
            
            <button
              onClick={handleRefresh}
              className="p-2 rounded-md hover:bg-muted transition-colors relative text-muted-foreground"
              title="Refresh Data"
            >
              <RotateCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
            </button>

            {/* Theme toggle - Always visible */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-muted transition-colors relative text-muted-foreground"
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

        <main className="flex-1 overflow-hidden relative">
          {isDesktop ? (
            <div className="h-full overflow-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
              <Outlet />
            </div>
          ) : (
            <Swiper
              modules={[Controller]}
              onSwiper={setSwiper}
              initialSlide={activeIndex === -1 ? 0 : activeIndex}
              onSlideChange={handleSlideChange}
              speed={400}
              touchAngle={45}
              threshold={15}
              resistanceRatio={0.7}
              className="h-full w-full"
            >
              {[0, 1, 2, 3, 4].map((idx) => (
                <SwiperSlide key={idx} className="h-full w-full overflow-auto pt-4 px-4 pb-20">
                  {activeIndex === idx ? <Outlet /> : <div className="h-full w-full" />}
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
