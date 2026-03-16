import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, LogIn, Globe } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<{ company_logo_url: string; public_site_url: string; login_bg_url: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('company_logo_url, public_site_url, login_bg_url').eq('id', 1).single();
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
      navigate('/dashboard');
    }
  };

  const hostname = siteSettings?.public_site_url ? new URL(siteSettings.public_site_url).hostname : 'hellotms.com.bd';

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        {siteSettings?.login_bg_url ? (
          <>
            <img 
              src={siteSettings.login_bg_url} 
              alt="Background" 
              className="w-full h-full object-cover blur-sm scale-105"
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
          <div className="inline-flex h-20 w-20 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-md items-center justify-center mb-5 shadow-2xl border border-white/20 overflow-hidden group hover:scale-105 transition-transform duration-500">
            {siteSettings?.company_logo_url ? (
              <img src={siteSettings.company_logo_url} alt="Logo" className="h-full w-full object-cover p-3" />
            ) : (
              <div className="h-full w-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-3xl">MS</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-md">The Marketing Solution</h1>
          <div className="flex items-center justify-center gap-1.5 text-blue-300 dark:text-blue-400 font-medium drop-shadow">
            <Globe className="h-3.5 w-3.5" />
            <p className="text-sm tracking-wide uppercase opacity-90">{hostname}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] transition-all duration-700">
          <div className="mb-10 text-center sm:text-left">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
            <p className="text-sm text-slate-500 dark:text-blue-100/60 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="space-y-2.5">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-blue-200 ml-1">
                Professional Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`admin@${hostname}`}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-blue-200 ml-1">
                Secure Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 pr-14 rounded-2xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-900 dark:hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl px-6 py-4 text-red-600 dark:text-red-400 text-sm font-bold animate-shake flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-4 flex items-center justify-center gap-3 bg-slate-900 dark:bg-primary hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 text-white font-black py-4 rounded-2xl transition-all shadow-2xl shadow-slate-900/20 dark:shadow-primary/30 text-xs uppercase tracking-[0.3em]"
            >
              {loading ? (
                <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {loading ? 'Authenticating...' : 'Sign In Now'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-8 drop-shadow-sm">
          © {new Date().getFullYear()} The Marketing Solution · {hostname}
        </p>
      </div>
    </div>
  );
}
