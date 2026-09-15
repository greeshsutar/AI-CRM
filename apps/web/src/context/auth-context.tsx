'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { ensureOnboarding } from '@/lib/api-client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signup: (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown>; redirectTo?: string },
  ) => Promise<{ user: User | null; session: Session | null }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const getSupabaseClient = useCallback(() => {
    return (supabaseRef.current ??= createClient());
  }, []);

  useEffect(() => {
    // createBrowserClient must only be called in the browser, never during
    // Next.js static prerendering (where env vars may not exist in CI).
    const supabase = getSupabaseClient();

    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setAccessToken(initialSession?.access_token ?? null);

        if (initialSession?.access_token && initialSession?.user) {
          ensureOnboarding(initialSession.access_token, initialSession.user).catch((err) => {
            console.warn('Post-confirmation onboarding check failed:', err);
          });
        }
      } catch (error) {
        console.error('Error fetching initial auth session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAccessToken(currentSession?.access_token ?? null);
      setLoading(false);

      if (currentSession?.access_token && currentSession?.user) {
        ensureOnboarding(currentSession.access_token, currentSession.user).catch((err) => {
          console.warn('Post-confirmation onboarding check failed:', err);
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [getSupabaseClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      setAccessToken(data.session?.access_token ?? null);

      return { user: data.user, session: data.session };
    },
    [getSupabaseClient],
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      options?: { data?: Record<string, unknown>; redirectTo?: string },
    ) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: options
          ? {
              data: options.data,
              emailRedirectTo: options.redirectTo,
            }
          : undefined,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        setAccessToken(data.session.access_token);
      }

      return { user: data.user, session: data.session };
    },
    [getSupabaseClient],
  );

  const logout = useCallback(async () => {
    const supabase = getSupabaseClient();
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setAccessToken(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getSupabaseClient]);

  const resetPassword = useCallback(
    async (email: string, redirectTo?: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }
    },
    [getSupabaseClient],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        accessToken,
        loading,
        login,
        signup,
        logout,
        signOut: logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
