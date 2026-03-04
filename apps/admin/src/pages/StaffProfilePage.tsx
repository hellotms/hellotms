import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { formatDate, getInitials } from '@/lib/utils';
import { ShieldCheck, Mail, Phone, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

type StaffMember = {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    created_at: string;
    roles: { id: string; name: string; label: string } | null;
};

export default function StaffProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: member, isLoading, error } = useQuery<StaffMember>({
        queryKey: ['staff', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, avatar_url, phone, address, is_active, created_at, roles(id, name, label)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as unknown as StaffMember;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                Loading profile...
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">Error loading profile or staff member not found.</p>
                <button
                    onClick={() => navigate('/staff')}
                    className="flex items-center gap-2 mx-auto text-primary hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Staff
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/staff')}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title="Back to Staff"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <PageHeader
                    title="Staff Profile"
                    description={`Viewing details for ${member.name}`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
                        {member.avatar_url ? (
                            <img
                                src={member.avatar_url}
                                alt={member.name}
                                className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-primary/10"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold mx-auto border-4 border-primary/10">
                                {getInitials(member.name)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold">{member.name}</h2>
                            <div className="flex items-center justify-center gap-1.5 mt-1 text-muted-foreground text-sm">
                                <ShieldCheck className="h-4 w-4" />
                                {member.roles?.label ?? 'No Role'}
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <StatusBadge status={member.is_active ? 'active' : 'inactive'} />
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quick Info</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate" title={member.email}>{member.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Joined {formatDate(member.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b border-border pb-3">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Phone Number</p>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <p>{member.phone || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Email Address</p>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <p>{member.email}</p>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Address</p>
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                    <p>{member.address || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold border-b border-border pb-3">Role & Permissions</h3>
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <span className="font-medium">{member.roles?.label}</span>
                                <code className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2">{member.roles?.name}</code>
                            </div>
                            <p className="text-sm text-muted-foreground italic">
                                Permissions are managed at the role level. To change permissions, please visit the Roles tab in the Staff section.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
