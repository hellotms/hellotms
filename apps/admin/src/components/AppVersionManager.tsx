import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appsApi, mediaApi, auditApi } from '@/lib/api';
import { toast } from '@/components/Toast';
import { 
  Monitor, Smartphone, Download, Plus, Trash2, CheckCircle2, 
  CircleDashed, History, Calendar, HardDrive, Tag, MessageSquare
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import type { AppVersion, AppPlatform } from '@hellotms/shared';

interface AppVersionManagerProps {
  platform: AppPlatform;
  disabled?: boolean;
}

export function AppVersionManager({ platform, disabled }: AppVersionManagerProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newExtension, setNewExtension] = useState<'.msi' | '.exe' | '.apk'>(platform === 'windows' ? '.msi' : '.apk');
  const [newChangelog, setNewChangelog] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['app-versions', platform],
    queryFn: () => appsApi.list(platform).then(res => res.data as AppVersion[]),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !newVersion) throw new Error('Version and File are required');
      setIsUploading(true);
      try {
        // 1. Upload to R2
        const uploadRes = await mediaApi.upload(
          selectedFile, 
          'apps', 
          platform, 
          `tms-admin-${newVersion.replace(/\./g, '-')}`
        );
        if (!uploadRes.success) throw new Error('Upload failed');

        // 2. Save to Database
        await appsApi.add({
          platform,
          version: newVersion,
          file_extension: newExtension,
          url: uploadRes.url,
          size: selectedFile.size,
          changelog: newChangelog,
          is_latest: !versions.some(v => v.file_extension === newExtension)
        });
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', platform] });
      toast('New version added!', 'success');
      setShowAddForm(false);
      setNewVersion('');
      setNewChangelog('');
      setSelectedFile(null);
      auditApi.log({ 
        action: 'app_version_added', 
        entity_type: 'app_version', 
        after: { platform, version: newVersion } 
      });
    },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const setLatestMutation = useMutation({
    mutationFn: (id: string) => appsApi.update(id, { is_latest: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', platform] });
      toast('Latest version updated', 'success');
    },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', platform] });
      toast('Version deleted', 'success');
    },
    onError: (e: any) => toast(e.message, 'error'),
  });

  const latestVersion = versions.find(v => v.is_latest);

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            platform === 'windows' ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"
          )}>
            {platform === 'windows' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">{platform === 'windows' ? 'Windows Desktop' : 'Android Mobile'}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Manage releases and download history</p>
          </div>
        </div>
        {!disabled && !showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-[10px] font-black bg-primary/10 text-primary px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-primary/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> New Version
          </button>
        )}
      </div>

      {/* Add New Version Form */}
      {showAddForm && (
        <div className="bg-muted/30 border border-primary/20 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version Number</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  value={newVersion}
                  onChange={e => setNewVersion(e.target.value)}
                  placeholder="e.g. 1.0.1"
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Binary File ({platform === 'windows' ? '.msi/.exe' : '.apk'})</label>
              <input 
                type="file"
                accept={platform === 'windows' ? (newExtension === '.msi' ? '.msi' : '.exe') : '.apk'}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>

            {platform === 'windows' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Windows Installer Type</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setNewExtension('.msi'); setSelectedFile(null); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      newExtension === '.msi' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-background text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    MSI (Standard)
                  </button>
                  <button 
                    onClick={() => { setNewExtension('.exe'); setSelectedFile(null); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      newExtension === '.exe' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-background text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    EXE (Portable)
                  </button>
                </div>
              </div>
            )}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What's New (Changelog)</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea 
                  value={newChangelog}
                  onChange={e => setNewChangelog(e.target.value)}
                  placeholder="Briefly describe fixes and new features..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/20 resize-none"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={isUploading || !newVersion || !selectedFile}
              onClick={() => addMutation.mutate()}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {isUploading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} 
              {isUploading ? 'Uploading...' : 'Publish Release'}
            </button>
          </div>
        </div>
      )}

      {/* Latest Version Banner */}
      {latestVersion ? (
        <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-2xl p-5 flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">v{latestVersion.version}</span>
                <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[8px] font-black uppercase tracking-widest rounded-lg">{latestVersion.file_extension}</span>
                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest rounded-full">Active</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(latestVersion.created_at).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {formatBytes(latestVersion.size || 0)}</span>
              </p>
            </div>
          </div>
          <a 
            href={latestVersion.url} 
            target="_blank"
            className="p-3 bg-background border border-border rounded-xl hover:bg-muted transition-all"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      ) : !isLoading && (
        <div className="bg-muted/20 border border-border border-dashed rounded-2xl p-8 text-center">
          <p className="text-xs text-muted-foreground font-medium italic">No versions published yet.</p>
        </div>
      )}

      {/* History List */}
      <div className="space-y-3">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <History className="h-3 w-3" /> Version History
        </h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><CircleDashed className="h-6 w-6 animate-spin text-primary/30" /></div>
          ) : versions.map((v) => (
            <div key={v.id} className={cn(
              "p-4 rounded-2xl border transition-all flex items-center justify-between group",
              v.is_latest ? "bg-card border-primary/20 border-dashed" : "bg-muted/10 border-border hover:bg-muted/20"
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground">v{v.version}</span>
                  <span className="px-1 py-0.5 bg-muted text-muted-foreground text-[8px] font-black uppercase tracking-widest rounded">{v.file_extension}</span>
                  <span className="text-[9px] text-muted-foreground font-medium">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                {v.changelog && <p className="text-[10px] text-muted-foreground truncate mt-0.5 pr-8">{v.changelog}</p>}
              </div>
              
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!v.is_latest && (
                  <button 
                    onClick={() => setLatestMutation.mutate(v.id)}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-primary/5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                  >
                    Set Latest
                  </button>
                )}
                <button 
                  onClick={() => { if(confirm('Delete this version?')) deleteMutation.mutate(v.id) }}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
