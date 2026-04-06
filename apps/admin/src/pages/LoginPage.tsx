import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, LogIn, Sparkles, Mail, ShieldCheck, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { toast } from '@/components/Toast';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password' | 'reset_success'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<{ company_logo_url: string; public_site_url: string; login_bg_url: string; site_motto: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('company_logo_url, public_site_url, login_bg_url, site_motto').eq('id', 1).single();
      if (data) setSiteSettings(data);
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/welcome');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    setError(null);
    setLoading(true);
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.themarketingsolution.com.bd';
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      setLoading(false);
      
      if (!res.ok) {
        setError(data.error || 'Failed to request password reset.');
      } else {
        setViewMode('reset_success');
        toast('Temporary password sent to mail!', 'success');
      }
    } catch (err: any) {
      setLoading(false);
      console.error('[Forgot Password Error]', err);
      setError('Connection to API server failed.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {siteSettings?.login_bg_url ? (
          <>
            <img
              src={siteSettings.login_bg_url}
              alt="Background"
              className="w-full h-full object-cover blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        )}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-1">
            <div className="h-16 w-16 sm:h-12 sm:w-12 rounded-2xl sm:rounded-xl bg-white/10 dark:bg-white/5 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden group hover:scale-105 transition-transform duration-500">
              {siteSettings?.company_logo_url ? (
                <img src={siteSettings.company_logo_url} alt="Logo" className="h-full w-full object-cover p-2.5 sm:p-2" />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-2xl sm:text-xl">MS</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md text-center sm:text-left">The Marketing Solution</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-blue-200/60 font-medium drop-shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <p className="text-[10px] tracking-[0.2em] uppercase">{siteSettings?.site_motto || 'Innovate . Engage . Grow'}</p>
          </div>
        </div>

        {/* Form card - Advanced 3D Glassmorphism */}
        <div className="relative bg-white/[0.08] dark:bg-white/[0.04] backdrop-blur-[24px] border border-white/30 dark:border-white/20 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-all duration-700 overflow-hidden isolate group/card">
          {/* Edge light reflections */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
          <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-tl from-white/5 via-transparent to-transparent opacity-30" />
          
          <div className="mb-8 text-center relative">
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              {viewMode === 'login' && 'Welcome Back'}
              {viewMode === 'forgot_password' && 'Reset Password'}
              {viewMode === 'reset_success' && 'Check Your Email'}
            </h2>
            <p className="text-sm text-white/40 font-medium italic">
              {viewMode === 'login' && 'Please enter your credentials to continue'}
              {viewMode === 'forgot_password' && 'Enter your email to receive a temporary password'}
              {viewMode === 'reset_success' && 'We have sent a temporary password to you'}
            </p>
          </div>

          {viewMode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-6 relative">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/60 ml-1">
                  Professional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@themarketingsolution.com.bd"
                  className="w-full px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-sm transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                   <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Secure Password
                  </label>
                </div>
               
                <div className="relative group/field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-6 py-3.5 pr-14 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-sm transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-3 text-red-400 text-xs font-bold animate-shake flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-2 flex items-center justify-center gap-3 bg-white text-slate-900 border border-white/50 hover:bg-slate-50 disabled:opacity-60 text-xs font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="h-5 w-5 border-3 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setError(null); setViewMode('forgot_password'); }}
                  className="text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors tracking-wide"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {viewMode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-6 relative animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/60 ml-1">
                  Registered Email Address
                </label>
                <div className="relative group/field">
                   <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                   <input
                     type="email"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="admin@themarketingsolution.com.bd"
                     className="w-full pl-14 pr-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-sm transition-all shadow-inner"
                   />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-3 text-red-400 text-xs font-bold animate-shake flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-white text-slate-900 border border-white/50 hover:bg-slate-50 disabled:opacity-60 text-xs font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-3 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {loading ? 'Sending...' : 'Send Temp Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setError(null); setViewMode('login'); }}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-white/5 text-white border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {viewMode === 'reset_success' && (
            <div className="space-y-8 relative animate-in fade-in zoom-in duration-500 text-center py-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                   <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-white/80 font-medium leading-relaxed">
                   A temporary password has been sent to your email address: <br/>
                   <span className="text-[#d6802b] font-bold">{email}</span>
                </p>
                <p className="text-white/40 text-xs">
                  Please check your inbox (and spam folder) and use the temporary password to log in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="w-full h-14 flex items-center justify-center gap-3 bg-white text-slate-900 border border-white/50 hover:bg-slate-50 text-xs font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] active:scale-[0.98]"
              >
                Proceed to Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-8 drop-shadow-sm">
          © {new Date().getFullYear()} The Marketing Solution
        </p>
      </div>
    </div>
  );
}
