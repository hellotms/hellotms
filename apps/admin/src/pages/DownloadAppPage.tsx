import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Monitor, Smartphone, Download, CheckCircle2, Info } from 'lucide-react';
import { toast } from '@/components/Toast';
import type { AppVersion } from '@hellotms/shared';
import { cn } from '@/lib/utils';
import type { SiteSettings } from '@hellotms/shared';

// Add Tauri open capability if running in desktop app
let openExternal: ((url: string) => Promise<void>) | null = null;
if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
  import('@tauri-apps/plugin-opener').then(m => {
    openExternal = m.openUrl;
  }).catch(() => {
    console.warn('Tauri plugin-opener not found');
  });
}

export default function DownloadAppPage() {
  const { data: versions = [], isLoading } = useQuery<AppVersion[]>({
    queryKey: ['app-versions-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_latest', true);
      if (error) throw error;
      return data as AppVersion[];
    }
  });

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    }
  });

  const getUrl = (platform: string) => versions.find(v => v.platform === platform)?.url;
  const getVersion = (platform: string) => versions.find(v => v.platform === platform)?.version || '0.1.0';

  const platforms = [
    {
      id: 'windows',
      name: 'Windows Desktop',
      description: 'Full-featured admin panel for your PC. Supports notifications and native window management.',
      icon: Monitor,
      url: getUrl('windows'),
      version: getVersion('windows'),
      color: 'blue',
      steps: [
        'Download the .msi or .exe installer',
        'Run the installer on your Windows PC',
        'Login with your admin credentials'
      ]
    },
    {
      id: 'android',
      name: 'Android Mobile',
      description: 'Manage your platform on the go. Get real-time updates and touch-optimized interface.',
      icon: Smartphone,
      url: getUrl('android'),
      version: getVersion('android'),
      color: 'green',
      steps: [
        'Download the APK file to your phone',
        'Enable "Install from Unknown Sources" if prompted',
        'Install and open the TMS Admin app'
      ]
    }
  ];

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-20 px-4">
      <PageHeader 
        title="Download TMS Admin" 
        description="Get the native application for your desktop and mobile devices for a better experience."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {platforms.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-3xl p-8 flex flex-col relative overflow-hidden group">
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 opacity-5 transition-transform group-hover:scale-110",
              p.color === 'blue' ? "bg-blue-500" : "bg-green-500"
            )} />

            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center",
                p.color === 'blue' ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"
              )}>
                <p.icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">{p.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version {p.version} (Latest)</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-8 flex-grow">
              {p.description}
            </p>

            <div className="space-y-4 mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Info className="h-3 w-3" /> Installation Steps
              </h4>
              <ul className="space-y-2">
                {p.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs font-medium text-foreground/80">
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", p.color === 'blue' ? "text-blue-500" : "text-green-500")} />
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {p.id === 'windows' ? (
              <div className="space-y-3">
                {(() => {
                  const msiVersion = versions.find(v => v.platform === 'windows' && v.file_extension === '.msi' && v.is_latest);
                  const exeVersion = versions.find(v => v.platform === 'windows' && v.file_extension === '.exe' && v.is_latest);
                  
                  return (
                    <>
                      {settings?.show_windows_msi !== false && (
                        <a
                          href={msiVersion?.url || '#'}
                          onClick={async (e) => {
                            if (!msiVersion?.url) { e.preventDefault(); return; }
                            toast('Starting MSI download...', 'info');
                            if (openExternal) {
                              e.preventDefault();
                              await openExternal(msiVersion.url);
                            }
                          }}
                          className={cn(
                            "w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                            msiVersion?.url 
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                        >
                          <Download className="h-4 w-4" />
                          {msiVersion?.url ? 'Download MSI Installer' : 'Coming Soon'}
                        </a>
                      )}
                      
                      {settings?.show_windows_exe && (
                        <a
                          href={exeVersion?.url || '#'}
                          onClick={async (e) => {
                            if (!exeVersion?.url) { e.preventDefault(); return; }
                            toast('Starting EXE download...', 'info');
                            if (openExternal) {
                              e.preventDefault();
                              await openExternal(exeVersion.url);
                            }
                          }}
                          className={cn(
                            "w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all border-2 border-blue-600/20 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10",
                            !exeVersion?.url && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Download className="h-4 w-4" />
                          {exeVersion?.url ? 'Download EXE Installer' : 'Coming Soon'}
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <a
                href={p.url || '#'}
                onClick={async (e) => {
                  if (!p.url) { e.preventDefault(); return; }
                  toast(`Starting ${p.id} download...`, 'info');
                  if (openExternal) {
                    e.preventDefault();
                    await openExternal(p.url);
                  }
                }}
                className={cn(
                  "w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all shadow-lg",
                  p.url 
                    ? "bg-green-600 text-white hover:bg-green-700 shadow-green-500/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Download className="h-4 w-4" />
                {p.url ? 'Download APK' : 'Coming Soon'}
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-6 flex gap-4 items-center">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Info className="h-5 w-5" />
        </div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          The desktop app provides a more stable experience with native system notifications. 
          Make sure to keep your app updated to receive the latest features and security improvements.
        </p>
      </div>
    </div>
  );
}
