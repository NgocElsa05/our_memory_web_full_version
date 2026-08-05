import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { clearPendingInvite, readPendingInvite, savePendingInvite } from '../lib/invite';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      // getUser() gọi server — nếu user đã bị xóa ở Authentication thì session local sẽ fail
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userErr || !userData?.user) {
        setSession(null);
        setLoading(false);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    };

    void syncSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setLoading(false);
        return;
      }

      // Supabase gọi _recoverAndRefresh mỗi lần tab visible lại → SIGNED_IN / TOKEN_REFRESHED.
      // Giữ identity ổn định để Space/OnboardingGate không flash loading / remount nhạc.
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
          // Token / profile mới nhưng cùng user — tránh đổi identity làm Space remount
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
