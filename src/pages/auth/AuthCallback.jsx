import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useSpace } from '../../context/SpaceContext';

const NEXT_KEY = 'auth_oauth_next';

export function saveOAuthNext(path) {
  sessionStorage.setItem(NEXT_KEY, path || '/onboarding/space');
}

export function readOAuthNext() {
  return sessionStorage.getItem(NEXT_KEY) || '/onboarding/space';
}

export function clearOAuthNext() {
  sessionStorage.removeItem(NEXT_KEY);
}

function mapOAuthError(params) {
  const err = (params.get('error') || params.get('error_code') || '').toLowerCase();
  let desc = params.get('error_description') || '';
  try {
    desc = decodeURIComponent(desc.replace(/\+/g, ' '));
  } catch {
    desc = desc.replace(/\+/g, ' ');
  }
  if (!err && !desc) return null;
  if (err.includes('access_denied')) return 'Bạn đã hủy đăng nhập Google.';
  if (desc.toLowerCase().includes('redirect') || err.includes('redirect')) {
    return 'Redirect URL chưa khớp trên Supabase hoặc Google Cloud.';
  }
  if (desc) return desc;
  return `Google đăng nhập lỗi: ${err || 'unknown'}`;
}

function looksLikeGoogleAuthCode(code) {
  // Mã Google thường dạng 4/0A… — không phải PKCE code của Supabase
  return typeof code === 'string' && /^4\//.test(code);
}

/**
 * Google / OAuth quay về đây — đợi session (detectSessionInUrl / SIGNED_IN).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { onboardingStep, loading: spaceLoading, refresh } = useSpace();
  const [message, setMessage] = useState('Đang đăng nhập bằng Google…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    async function fail(msg) {
      if (cancelled) return;
      setFailed(true);
      setMessage(msg);
      timeoutId = setTimeout(() => navigate('/login', { replace: true }), 4000);
    }

    async function finish() {
      const oauthErr = mapOAuthError(searchParams);
      if (oauthErr) {
        await fail(oauthErr);
        return;
      }

      const code = searchParams.get('code');
      if (code && looksLikeGoogleAuthCode(code)) {
        await fail(
          'Google đang trả mã về nhầm app (4/0A…). Trong Google Cloud → Credentials → OAuth Client, Authorized redirect URIs chỉ để: https://bpeyxtzmkzidsckizdag.supabase.co/auth/v1/callback (không để URL Vercel).'
        );
        return;
      }

      // Chờ client tự xử lý PKCE (detectSessionInUrl) hoặc event SIGNED_IN
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (existing) {
        await refresh();
        if (cancelled) return;
        clearOAuthNext();
        setMessage('Đăng nhập thành công, đang vào Space…');
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;
        if (error) {
          const msg = error.message || '';
          if (msg.toLowerCase().includes('exchange external code') || looksLikeGoogleAuthCode(code)) {
            await fail(
              'Sai Redirect URI trên Google Cloud. Chỉ dùng: https://bpeyxtzmkzidsckizdag.supabase.co/auth/v1/callback'
            );
          } else {
            await fail(msg || 'Không đổi được mã đăng nhập Google.');
          }
          return;
        }
        if (data?.session) {
          await refresh();
          if (cancelled) return;
          clearOAuthNext();
          setMessage('Đăng nhập thành công, đang vào Space…');
          return;
        }
      }

      // Fallback: lắng nghe auth change một lúc
      const waited = await new Promise((resolve) => {
        let settled = false;
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (settled) return;
          if (event === 'SIGNED_IN' && session) {
            settled = true;
            clearTimeout(timer);
            sub.subscription.unsubscribe();
            resolve(session);
          }
        });
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          sub.subscription.unsubscribe();
          resolve(null);
        }, 2500);
      });

      if (cancelled) return;
      if (waited) {
        await refresh();
        if (cancelled) return;
        clearOAuthNext();
        setMessage('Đăng nhập thành công, đang vào Space…');
        return;
      }

      await fail('Đăng nhập Google chưa thành công. Kiểm tra Redirect URI Google Cloud / Supabase rồi thử lại.');
    }

    finish();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, refresh, searchParams]);

  useEffect(() => {
    if (failed) return;
    if (spaceLoading || onboardingStep === 'loading' || onboardingStep === 'logged_out') return;
    if (onboardingStep === 'ready') {
      clearOAuthNext();
      navigate('/', { replace: true });
      return;
    }
    if (
      onboardingStep === 'need_space' ||
      onboardingStep === 'need_dates' ||
      onboardingStep === 'need_theme' ||
      onboardingStep === 'need_preview' ||
      onboardingStep === 'need_profile'
    ) {
      const map = {
        need_space: '/onboarding/space',
        need_dates: '/onboarding/dates',
        need_theme: '/onboarding/theme',
        need_preview: '/onboarding/space-preview',
        need_profile: '/onboarding/profile',
      };
      clearOAuthNext();
      navigate(map[onboardingStep], { replace: true });
    }
  }, [onboardingStep, spaceLoading, navigate, failed]);

  return (
    <div className="min-h-screen bg-[var(--om-tint)] flex items-center justify-center px-6 text-center">
      <p
        className={`text-sm font-black max-w-md ${
          failed
            ? 'text-rose-500 font-semibold normal-case tracking-normal'
            : 'uppercase tracking-widest text-[var(--om-primary)]'
        }`}
      >
        {message}
      </p>
    </div>
  );
}
