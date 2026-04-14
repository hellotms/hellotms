import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appsApi, mediaApi, auditApi } from '@/lib/api';
import { toast } from '@/components/Toast';
import { 
  Monitor, Smartphone, Download, Plus, Trash2, CheckCircle2, 
  CircleDashed, History, Calendar, HardDrive, Tag, MessageSquare,
  Edit2, X
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
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const [newVersion, setNewVersion] = useState('');
  const [newSignature, setNewSignature] = useState('');
  const [newExtension, setNewExtension] = useState<'.msi' | '.exe' | '.apk'>(platform === 'windows' ? '.msi' : '.apk');
  const [newChangelog, setNewChangelog] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['app-versions', platform],
    queryFn: () => appsApi.list(platform).then(res => res.data as AppVersion[]),
  });

  // Sync form when editing
  useEffect(() => {
    if (editingVersion) {
      setNewVersion(editingVersion.version);
      setNewSignature(editingVersion.signature || '');
      setNewExtension(editingVersion.file_extension as any);
      setNewChangelog(editingVersion.changelog || '');
      setShowAddForm(true);
    }
  }, [editingVersion]);

  const clearForm = () => {
    setEditingVersion(null);
    setShowAddForm(false);
    setNewVersion('');
    setNewSignature('');
    setNewChangelog('');
    setSelectedFile(null);
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!newVersion) throw new Error('Version is required');
      if (!editingVersion && !selectedFile) throw new Error('File is required for new versions');
      
      setIsUploading(true);
      try {
        let finalUrl = editingVersion?.url || '';
        let finalSize = editingVersion?.size || 0;

        // 1. Handle File (Replace if new one selected, or upload new)
        if (selectedFile) {
          const res = await mediaApi.uploadAndCleanMedia(
            selectedFile,
            editingVersion?.url, // Old URL to cleanup if replacing
            'apps',
            platform,
            `tms-admin-${newVersion.replace(/\./g, '-')}`
          );
          if (res) {
            finalUrl = res;
            finalSize = selectedFile.size;
          }
        }

        // 2. Save to Database
        if (editingVersion) {
          await appsApi.update(editingVersion.id, {
            version: newVersion,
            file_extension: newExtension,
            url: finalUrl,
            size: finalSize,
            changelog: newChangelog,
            signature: newSignature,
          });
        } else {
          await appsApi.add({
            platform,
            version: newVersion,
            file_extension: newExtension,
            url: finalUrl,
            size: finalSize,
            changelog: newChangelog,
            signature: newSignature,
            is_latest: !versions.some(v => v.file_extension === newExtension)
          });
        }
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions', platform] });
      toast(editingVersion ? 'Version updated!' : 'New version added!', 'success');
      
      auditApi.log({ 
        action: editingVersion ? 'app_version_updated' : 'app_version_added', 
        entity_type: 'app_version', 
        after: { platform, version: newVersion } 
      });

      clearForm();
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

  // Form validation state
  const isFormDisabled = isUploading || !newVersion || (!editingVersion && !selectedFile) || (platform === 'windows' && !newSignature);

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

      {/* Add/Edit Version Form */}
      {showAddForm && (
        <div className="bg-muted/30 border border-primary/20 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
             <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
               {editingVersion ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
               {editingVersion ? `Edit v${editingVersion.version}` : 'Publish New Version'}
             </h4>
             <button onClick={clearForm} className="p-1 hover:bg-muted rounded-lg transition-all"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version Number <span className="text-red-500">*</span></label>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {editingVersion ? 'Replace Binary (Optional)' : `Binary File (${platform === 'windows' ? '.msi/.exe' : '.apk'})`} 
                {!editingVersion && <span className="text-red-500"> *</span>}
              </label>
              <input 
                type="file"
                accept={platform === 'windows' ? (newExtension === '.msi' ? '.msi' : '.exe') : '.apk'}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {editingVersion && !selectedFile && (
                <p className="text-[9px] text-muted-foreground mt-1">Keep empty to maintain current file: <span className="font-mono">{editingVersion.url.split('/').pop()}</span></p>
              )}
            </div>

            {platform === 'windows' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Windows Installer Type</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewExtension('.msi')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      newExtension === '.msi' ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-background text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    MSI (Standard)
                  </button>
                  <button 
                    onClick={() => setNewExtension('.exe')}
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
            {platform === 'windows' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Update Signature (Required for Auto-Update) <span className="text-red-500">*</span></label>
                <textarea 
                  value={newSignature}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('untrusted comment')) {
                      const lines = val.split(/\r?\n/);
                      if (lines.length >= 2) {
                        setNewSignature(lines[1].trim());
                        return;
                      }
                    }
                    setNewSignature(val);
                  }}
                  placeholder="PASTE .sig FILE CONTENT HERE (Auto-extracts signature)"
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/20 resize-none font-mono"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={clearForm}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={isFormDisabled}
              onClick={() => upsertMutation.mutate()}
              className={cn(
                "flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg",
                isFormDisabled 
                  ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" 
                  : "bg-green-500 text-white hover:bg-green-600 shadow-green-500/20"
              )}
            >
              {isUploading ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : (editingVersion ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />)} 
              {isUploading ? 'Processing...' : (editingVersion ? 'Update Version' : 'Publish Release')}
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setEditingVersion(latestVersion)}
              className="p-3 bg-background border border-border rounded-xl hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <a 
              href={latestVersion.url} 
              target="_blank"
              className="p-3 bg-background border border-border rounded-xl hover:bg-muted transition-all"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
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
                <button 
                  onClick={() => setEditingVersion(v)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
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
