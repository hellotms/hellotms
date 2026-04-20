import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mediaApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { Plus, Users, Edit, Trash2, GripVertical, Image as ImageIcon, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Reorder } from 'framer-motion';

type TeamMember = {
  id: string;
  name: string;
  designation: string;
  photo_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  display_order: number;
  is_published: boolean;
};

export default function OurTeamCmsPage() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<TeamMember[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<Partial<TeamMember>>();

  const { isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      const members = (data || []) as TeamMember[];
      setItems(members);
      return members;
    }
  });

  const openForm = (item?: TeamMember) => {
    if (item) {
      setEditingItem(item);
      reset(item);
    } else {
      setEditingItem(null);
      reset({ 
        name: '', 
        designation: '', 
        photo_url: '', 
        facebook_url: '', 
        linkedin_url: '', 
        twitter_url: '', 
        is_published: true, 
        display_order: items.length 
      });
    }
    setSelectedFile(null);
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setSelectedFile(null);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<TeamMember>) => {
      let photo_url = values.photo_url;

      if (selectedFile) {
        setIsUploading(true);
        try {
           const path = `team/${Date.now()}_${selectedFile.name}`;
           const resUrl = await mediaApi.uploadAndCleanMedia(selectedFile, null, 'images/team', 'photo', 'team');
           if (resUrl) photo_url = resUrl;
        } finally {
          setIsUploading(false);
        }
      }

      const payload = { ...values, photo_url };

      if (editingItem) {
        const { error } = await supabase.from('team_members').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('team_members').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      closeForm();
      toast('Team member saved successfully', 'success');
    },
    onError: (err: any) => toast(err.message, 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteId) return;
      const { error } = await supabase.from('team_members').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
      if (error) throw error;
    },
  });
  
  const reorderMutation = useMutation({
    mutationFn: async (newItems: TeamMember[]) => {
      const updates = newItems.map((item, idx) => ({
        id: item.id,
        display_order: idx
      }));
      
      // Update locally first for optimistic UI response
      setItems(newItems);

      for (const update of updates) {
        const { error } = await supabase
          .from('team_members')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        if (error) console.error('Failed to update order for', update.id, error);
      }
    },
    onSuccess: () => {
      // Invalidate but don't force a re-fetch immediately to avoid jitter
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string, is_published: boolean }) => {
      const { error } = await supabase.from('team_members').update({ is_published }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] })
  });

  return (
    <div>
      <PageHeader 
        title="Team Portfolio Management" 
        description="Manage the team members displayed in the public 'Our Team' section."
        actions={
          <button onClick={() => openForm()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Member
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl mt-6">
        {isLoading && items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
             Loading team members...
          </div>
        ) : items.length === 0 ? (
           <div className="py-24 text-center">
             <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
             </div>
             <h3 className="text-lg font-bold">No team members yet</h3>
             <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto mb-6">Add your organizational members here to showcase them publicly on your portfolio site.</p>
             <button onClick={() => openForm()} className="bg-primary/10 text-primary px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-primary/20">Add First Member</button>
           </div>
        ) : (
          <Reorder.Group axis="y" values={items} onReorder={reorderMutation.mutate} className="divide-y divide-border">
            {items.map((member) => (
              <Reorder.Item 
                key={member.id} 
                value={member}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-muted/30 transition-colors bg-card"
              >
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="h-16 w-16 rounded-xl object-cover border border-border bg-muted/50 shrink-0 pointer-events-none" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-base tracking-tight">{member.name}</h4>
                  <p className="text-sm text-primary font-medium">{member.designation}</p>
                  
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {member.facebook_url && <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> FB Linked</span>}
                    {member.linkedin_url && <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> IN Linked</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border">
                   <label className="flex items-center gap-2 cursor-pointer mr-2">
                     <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${member.is_published ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                         <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${member.is_published ? 'translate-x-5' : ''}`} />
                     </div>
                     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{member.is_published ? 'Public' : 'Hidden'}</span>
                     {/* Hidden input to make it accessible to click but let the wrapper handle the visual */}
                     <input type="checkbox" className="hidden" checked={member.is_published} onChange={(e) => togglePublishMutation.mutate({ id: member.id, is_published: e.target.checked })} />
                   </label>
                   
                   <div className="flex gap-1 border-l border-border pl-4">
                     <button onClick={() => openForm(member)} className="p-2 text-muted-foreground hover:text-primary transition-colors bg-card hover:bg-muted border border-transparent rounded-lg">
                       <Edit className="h-4 w-4" />
                     </button>
                     <button onClick={() => setDeleteId(member.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-card hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent rounded-lg">
                       <Trash2 className="h-4 w-4" />
                     </button>
                   </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={closeForm} title={editingItem ? 'Edit Member' : 'Add Team Member'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-semibold mb-1">Name *</label>
               <input {...register('name', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="Member Name" />
             </div>
             <div>
               <label className="block text-xs font-semibold mb-1">Designation *</label>
               <input {...register('designation', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="e.g. Lead Designer" />
             </div>
           </div>

           <div>
              <label className="block text-xs font-semibold mb-2">Photo</label>
              <div className="flex items-start gap-4">
                 {(selectedFile || editingItem?.photo_url) ? (
                    <img 
                      src={selectedFile ? URL.createObjectURL(selectedFile) : (editingItem?.photo_url || '')} 
                      className="h-20 w-20 rounded-xl object-cover border border-border" 
                      alt="Preview" 
                    />
                 ) : (
                    <div className="h-20 w-20 rounded-xl bg-muted border border-border border-dashed flex items-center justify-center">
                       <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                 )}
                 <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm bg-card hover:bg-muted">
                      Select Image
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && setSelectedFile(e.target.files[0])} />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-2">Square images work best. Max 2MB.</p>
                 </div>
              </div>
           </div>

           <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground">Social Links</h4>
              <div className="space-y-3">
                 <div>
                   <input {...register('facebook_url')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="Facebook Profile URL" />
                 </div>
                 <div>
                   <input {...register('linkedin_url')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="LinkedIn Profile URL" />
                 </div>
                 <div>
                   <input {...register('twitter_url')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card" placeholder="Twitter Profile URL" />
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending || isUploading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-60">
                 {saveMutation.isPending || isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                 {editingItem ? 'Save Changes' : 'Add Member'}
              </button>
           </div>
        </form>
      </Modal>
      
      <ConfirmModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Member"
        message="Are you sure you want to remove this team member? This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
