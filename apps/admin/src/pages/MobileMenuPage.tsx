import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { cn, getInitials } from '@/lib/utils';
import {
  X, UserCog, MessageSquare, Megaphone, Users, Trash2,
  ClipboardList, Globe, Download, LogOut, ChevronRight, Sun, Moon,
  LayoutDashboard, FolderOpen, Building2, FileText, Settings, ShieldCheck, ArrowLeft
} from 'lucide-react';
import packageJson from '../../package.json';

const drawerNavItems = [
  { to: '/leads', label: 'Contact Form', icon: MessageSquare, permission: 'view_leads' },
  { to: '/notices', label: 'Notice Board', icon: Megaphone, permission: 'view_notices' },
  { to: '/staff', label: 'All Staff', icon: Users, permission: 'view_staff' },
  { to: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, permission: 'manage_staff' },
  { to: '/work-logs', label: 'Activity Log', icon: ClipboardList, permission: 'view_audit_logs' },
  { to: '/cms', label: 'Core Settings', icon: Globe, permission: 'manage_cms' },
  { to: '/download-app', label: 'Download App', icon: Download },
];

export default function MobileMenuPage() {
  const navigate = useNavigate();
  const { profile, role, can, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredItems = drawerNavItems.filter(item => {
    if (!item.permission) return true;
    if (role?.name === 'super_admin') return true;
    return can(item.permission);
  });

  return (
    <div className="flex flex-col min-h-full bg-background pb-10">
      <div className="flex items-center gap-3 px-2 py-4 border-b border-border/60 mb-2">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">App Menu</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile card */}
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-4 px-6 py-6 border-b border-border/60 hover:bg-muted/30 transition-all active:scale-[0.99] group mt-2"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="h-16 w-16 rounded-3xl object-cover ring-2 ring-primary/20 shadow-lg" />
          ) : (
            <div className="h-16 w-16 rounded-3xl bg-primary flex items-center justify-center text-xl font-bold text-white ring-2 ring-primary/20 shadow-lg">
              {getInitials(profile?.name ?? 'U')}
            </div>
          )}
          <div className="flex-1 text-left min-w-0">
            <p className="text-lg font-black text-foreground truncate tracking-tight">{profile?.name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mt-0.5">{role?.name?.replace('_', ' ') ?? 'Viewer'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1.5 bg-primary/10 rounded-full">
            Manage
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>

        {/* Essential Apps Grid for quick access */}
        <div className="grid grid-cols-2 gap-3 px-5 py-6">
            <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-blue-500 transition-all active:scale-95">
                <LayoutDashboard className="h-6 w-6 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
            </button>
            <button onClick={() => navigate('/projects')} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-purple-500/5 border border-purple-500/10 text-purple-500 transition-all active:scale-95">
                <FolderOpen className="h-6 w-6 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Portfolio</span>
            </button>
        </div>

        {/* Theme toggle */}
        <div className="flex items-center justify-between px-6 py-4 mx-5 bg-muted/30 rounded-3xl border border-border/60">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-500" />}
             </div>
             <span className="text-sm font-bold text-foreground">Dark Theme</span>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              "relative w-12 h-6.5 rounded-full transition-all duration-300",
              theme === 'dark' ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'bg-muted-foreground/20'
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center",
              theme === 'dark' ? 'translate-x-[24px]' : 'translate-x-0.5'
            )} />
          </button>
        </div>

        <div className="mt-8 px-5">
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3 mb-3">Organization</h2>
           <div className="bg-card/50 border border-border/60 rounded-[32px] overflow-hidden">
                {filteredItems.map(({ to, label, icon: Icon }, idx) => (
                <button
                    key={to}
                    onClick={() => navigate(to)}
                    className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-sm font-bold text-foreground/80 hover:bg-muted/30 transition-all active:scale-[0.98] group",
                        idx !== filteredItems.length - 1 && "border-b border-border/40"
                    )}
                >
                    <div className="h-10 w-10 rounded-2xl bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="flex-1 text-left">{label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                </button>
                ))}
           </div>
        </div>

        {/* App info */}
        <div className="mt-10 px-8 py-6 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full border border-border/60">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Production Secure</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                The Marketing Solution v{packageJson.version}
            </p>
            <button
              onClick={handleSignOut}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-3xl text-sm font-bold text-red-500 bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all active:scale-95"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out Securely</span>
            </button>
        </div>
      </div>
    </div>
  );
}
