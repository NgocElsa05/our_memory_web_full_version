import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { clearPendingInvite, readPendingInvite, savePendingInvite } from '../lib/invite';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Set ngay để tránh race: navigate trước khi onAuthStateChange kịp chạy
    if (data.session) setSession(data.session);
    return data;
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session) setSession(data.session);
    return data;
  }, []);

  const signInWithGoogle = useCallback(async (nextPath = '/onboarding/space') => {
    const invite = readPendingInvite();
    if (invite) savePendingInvite(invite);

    // Luôn về /auth/callback trước — ổn định hơn trên localhost
    const next =
      invite && !nextPath.startsWith('/invite')
        ? `/invite/${encodeURIComponent(invite)}`
        : nextPath;
    sessionStorage.setItem('auth_oauth_next', next);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    clearPendingInvite();
    setSession(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
    }),
    [session, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth chỉ dùng trong AuthProvider');
  return ctx;
}
