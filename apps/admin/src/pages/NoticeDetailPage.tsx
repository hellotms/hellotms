import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, User, FileText, Pin } from 'lucide-react';
import type { Notice } from '@hellotms/shared';

export default function NoticeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: notice, isLoading } = useQuery<Notice>({
        queryKey: ['notice', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notices')
                .select('*, profiles(name, avatar_url)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Notice;
        },
        enabled: !!id,
    });

    if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading notice...</div>;
    if (!notice) return <div className="py-20 text-center text-muted-foreground">Notice not found</div>;

    const atts = (notice.attachments as any[]) ?? [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => navigate('/notices')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Notice Board
            </button>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {notice.cover_url && (
                    <div className="h-64 w-full relative">
                        <img src={notice.cover_url} alt="" className="w-full h-full object-cover" />
                        {notice.is_pinned && (
                            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md shadow flex items-center gap-1.5">
                                <Pin className="h-3.5 w-3.5" /> Pinned Notice
                            </div>
                        )}
                    </div>
                )}

                <div className="p-8 md:p-10 space-y-8">
                    {(!notice.cover_url && notice.is_pinned) && (
                        <div className="inline-flex bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md mb-2 items-center gap-1.5 border border-primary/20">
                            <Pin className="h-3.5 w-3.5" /> Pinned Notice
                        </div>
                    )}

                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">{notice.title}</h1>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{notice.profiles?.name ?? 'Admin'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(notice.created_at)}</span>
                            </div>
                            {notice.expires_at && (
                                <div className="flex items-center gap-1.5 text-orange-500">
                                    <Calendar className="h-4 w-4" />
                                    <span>Expires: {formatDate(notice.expires_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="prose prose-sm md:prose-base max-w-none text-foreground whitespace-pre-wrap">
                        {notice.body || <span className="italic text-muted-foreground">No additional details provided.</span>}
                    </div>

                    {atts.length > 0 && (
                        <div className="pt-8 border-t border-border mt-8">
                            <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider text-muted-foreground">Attachments & Links</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {atts.map((att, idx) => (
                                    <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="h-10 w-10 shrink-0 rounded bg-primary/10 text-primary flex items-center justify-center">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{att.name || 'Attachment Link'}</p>
                                            <p className="text-xs text-muted-foreground truncate">{att.url}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
