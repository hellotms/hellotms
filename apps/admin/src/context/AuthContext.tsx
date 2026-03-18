import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { staffApi } from '@/lib/api';
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
// Removed isVerifyingRef; session validation now handled via API responses.

  const fetchProfile = useCallback(async (userId: string) => {
    // Skip fetching when offline to avoid network errors
    if (!navigator.onLine) {
      console.warn('[AuthContext] Offline: skipping profile fetch');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(*)')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('[AuthContext] Profile fetch error:', error);
        // Show toast only for non-network errors
        if (!error.message?.includes('Failed to fetch')) {
          if (error.code === 'PGRST116') {
            toast('No profile found for your account. Please contact an administrator.', 'error');
          } else {
            toast(`Failed to load profile: ${error.message}`, 'error');
          }
        }
        return;
      }
      if (data) {
        if (!data.roles) {
          toast('No role assigned to your account. Please contact an administrator.', 'error');
        }
        setProfile(data as Profile);
        setRole(data.roles as Role ?? null);
      }
    } catch (err: any) {
      // Network or unexpected errors are silently ignored
      console.warn('[AuthContext] Profile fetch exception (ignored):', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }, []);

// Session validation is now performed centrally in apiFetch; no background validation needed.

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthContext] Initial session error:', error);
        // If it's a refresh token error, clear everything
        if (error.message.includes('Refresh Token')) {
          supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] State change:', _event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
        // If the session was revoked or lost, ensure we clear any local state and redirect
        if (_event === 'SIGNED_OUT') {
          window.location.href = '/login';
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const can = useCallback((permission: string): boolean => {
    if (role?.name === 'super_admin') return true;
    return Boolean(role?.permissions?.[permission]);
  }, [role]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
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
