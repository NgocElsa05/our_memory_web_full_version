import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { clearPendingInvite, readPendingInvite, savePendingInvite } from '../lib/invite';
import { clearSpaceBootCache } from '../lib/spaceBootCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrateLocalThenValidate = async () => {
      // 1) Đọc session local ngay — không chờ mạng → tránh flash loading khi tab restore
      const { data: local } = await supabase.auth.getSession();
      if (!mounted) return;
      if (local.session) {
        setSession(local.session);
        setLoading(false);
      }

      // 2) Validate với server; lỗi mạng thì giữ session local, không đá logout
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userErr) {
        const msg = (userErr.message || '').toLowerCase();
        const transient =
          msg.includes('network') ||
          msg.includes('fetch') ||
          msg.includes('timeout') ||
          msg.includes('failed to fetch');
        if (!transient && !userData?.user) {
          setSession(null);
          setLoading(false);
          clearSpaceBootCache();
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        setLoading(false);
        return;
      }

      if (!userData?.user) {
        setSession(null);
        setLoading(false);
        clearSpaceBootCache();
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    };

    void hydrateLocalThenValidate();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setLoading(false);
        clearSpaceBootCache();
        return;
      }

      // Tab focus → Supabase _recoverAndRefresh → SIGNED_IN / TOKEN_REFRESHED
      setSession((prev) => {
        if (!next) return prev;

        const sameUser =
          Boolean(prev?.user?.id) &&
          Boolean(next?.user?.id) &&
          prev.user.id === next.user.id;

        if (sameUser) {
          if (
            prev.access_token === next.access_token &&
            prev.refresh_token === next.refresh_token &&
            prev.expires_at === next.expires_at &&
            event !== 'USER_UPDATED'
          ) {
            return prev;
          }
          return {
            ...next,
            user: event === 'USER_UPDATED' ? next.user : prev.user,
          };
        }

        return next;
      });
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
    clearSpaceBootCache();
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
