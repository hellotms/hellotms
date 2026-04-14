import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Building2, FileText, User, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastProjectId = localStorage.getItem('last_project_id');
  
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isBillingActive = location.pathname === '/mobile-billing' || location.pathname.startsWith('/estimates') || location.pathname.startsWith('/invoices');
  const isMenuActive = location.pathname === '/mobile-menu';

  const handlePortfolioClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Logic: 
    // 1. If we are currently ON a project detail page (/projects/:id), go to the main list (/projects)
    const isDetail = /^\/projects\/[a-f0-9-]+/i.test(location.pathname);
    
    if (isDetail) {
      navigate('/projects');
    } else if (lastProjectId) {
      // 2. If we have a last project and we are NOT on a detail page, go to that project
      navigate(`/projects/${lastProjectId}`);
    } else {
      // 3. Otherwise just go to projects list
      navigate('/projects');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
      <nav
        className="flex items-stretch bg-sidebar border-t border-sidebar-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Dashboard */}
        <NavLink
            to="/dashboard"
            className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[64px]',
                isActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
        >
            {({ isActive }) => (
                <>
                <div className={cn(
                    'flex items-center justify-center rounded-2xl transition-all duration-300',
                    isActive ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]' : 'px-0 py-0'
                )}>
                    <LayoutDashboard className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={cn('text-[10px] leading-none mt-1', isActive ? 'font-bold' : 'font-medium')}>Dashboard</span>
                </>
            )}
        </NavLink>

        {/* Portfolio - Dynamic */}
        <button
            onClick={handlePortfolioClick}
            className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[64px]',
                isProjectsActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
        >
            <div className={cn(
                'flex items-center justify-center rounded-2xl transition-all duration-300',
                isProjectsActive ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]' : 'px-0 py-0'
            )}>
                <FolderOpen className="h-[20px] w-[20px]" strokeWidth={isProjectsActive ? 2.5 : 1.8} />
            </div>
            <span className={cn('text-[10px] leading-none mt-1', isProjectsActive ? 'font-bold' : 'font-medium')}>Portfolio</span>
        </button>

        {/* Companies */}
        <NavLink
            to="/companies"
            className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[64px]',
                isActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
        >
            {({ isActive }) => (
                <>
                <div className={cn(
                    'flex items-center justify-center rounded-2xl transition-all duration-300',
                    isActive ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]' : 'px-0 py-0'
                )}>
                    <Building2 className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={cn('text-[10px] leading-none mt-1', isActive ? 'font-bold' : 'font-medium')}>Companies</span>
                </>
            )}
        </NavLink>

        {/* Billing - Now a Page */}
        <NavLink
            to="/mobile-billing"
            className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[64px]',
                isBillingActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
        >
            <div className={cn(
                'flex items-center justify-center rounded-2xl transition-all duration-300',
                isBillingActive ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]' : 'px-0 py-0'
            )}>
                <FileText className="h-[20px] w-[20px]" strokeWidth={isBillingActive ? 2.5 : 1.8} />
            </div>
            <span className={cn('text-[10px] leading-none mt-1', isBillingActive ? 'font-bold' : 'font-medium')}>Billing</span>
        </NavLink>

        {/* Menu - Replacing the drawer */}
        <NavLink
            to="/mobile-menu"
            className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all min-h-[64px]',
                isActive ? 'text-primary' : 'text-sidebar-foreground/40 active:text-sidebar-foreground/60'
            )}
        >
            {({ isActive }) => (
                <>
                <div className={cn(
                    'flex items-center justify-center rounded-2xl transition-all duration-300',
                    isActive ? 'bg-primary/15 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-[0_0_12px_rgba(var(--primary),0.15)]' : 'px-0 py-0'
                )}>
                    <Menu className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={cn('text-[10px] leading-none mt-1', isActive ? 'font-bold' : 'font-medium')}>Menu</span>
                </>
            )}
        </NavLink>
      </nav>
    </div>
  );
}
