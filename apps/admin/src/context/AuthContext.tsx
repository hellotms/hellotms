import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@hellotms/shared';
import { toast } from '@/components/Toast';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  can: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, roles(*)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[AuthContext] Profile fetch error:', error);
      if (error.code === 'PGRST116') {
        toast('আপনার অ্যাকাউন্টে কোনো প্রোফাইল পাওয়া যায়নি। অ্যাডমিনকে জানান।', 'error');
      } else {
        toast(`প্রোফাইল লোড করা যায়নি: ${error.message}`, 'error');
      }
      return;
    }

    if (data) {
      if (!data.roles) {
        toast('আপনার অ্যাকাউন্টে কোনো রোল সেট করা নেই। অ্যাডমিনকে জানান।', 'error');
      }
      setProfile(data as Profile);
      setRole(data.roles as Role ?? null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setRole(null); }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const can = useCallback((permission: string): boolean => {
    if (role?.name === 'super_admin') return true;
    return Boolean(role?.permissions?.[permission]);
  }, [role]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, can, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
