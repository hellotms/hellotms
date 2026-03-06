import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, ShieldCheck, User, LogOut } from 'lucide-react';
import { toast } from '@/components/Toast';

export default function SetupPage() {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState(profile?.name ?? '');
    const [phone, setPhone] = useState(profile?.phone ?? '');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!displayName.trim()) {
            setError('Display name is required.');
            return;
        }

        setLoading(true);
        try {
            // 1. Update password
            const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
            if (pwErr) throw pwErr;

            // 2. Update profile: name, phone, force_password_change = false
            const { error: profileErr } = await supabase
                .from('profiles')
                .update({ name: displayName.trim(), phone: phone.trim() || null, force_password_change: false })
                .eq('id', user!.id);
            if (profileErr) throw profileErr;

            await refreshProfile();
            toast('Setup complete! Welcome.', 'success');
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 rounded-2xl bg-primary items-center justify-center mb-4 shadow-lg shadow-primary/30">
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Set Up Your Account</h1>
                    <p className="text-blue-300 text-sm mt-1">
                        You were logged in with a temporary password. Please create a new password to continue.
                    </p>
                </div>

                <div className="bg-white dark:bg-[#1c1c1c]/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Display Name */}
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                Display Name <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#1c1c1c]/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                />
                            </div>
                        </div>

                        {/* Phone (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                Phone <span className="text-white/30 text-xs">(optional)</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+880 1XXX-XXXXXX"
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-[#1c1c1c]/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>

                        <div className="border-t border-white/10 pt-4">
                            {/* New Password */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                    New Password <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white dark:bg-[#1c1c1c]/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                                    >
                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                    Confirm Password <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-[#1c1c1c]/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ShieldCheck className="h-4 w-4" />
                            )}
                            {loading ? 'Saving...' : 'Complete Setup & Continue'}
                        </button>

                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium py-2.5 rounded-lg transition-colors text-sm border border-white/10"
                        >
                            <LogOut className="h-4 w-4" />
                            Log Out
                        </button>
                    </form>
                </div>

                <p className="text-center text-blue-400/60 text-xs mt-6">
                    © {new Date().getFullYear()} The Marketing Solution · All rights reserved
                </p>
            </div>
        </div>
    );
}
