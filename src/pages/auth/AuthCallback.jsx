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
    return 'Redirect URL chưa khớp. Trong Supabase → Authentication → URL Configuration hãy thêm https://our--memory.vercel.app/** và https://our--memory.vercel.app/auth/callback';
  }
  if (desc) return desc;
  return `Google đăng nhập lỗi: ${err || 'unknown'}`;
}

/**
 * Google / OAuth quay về đây trước — đợi session xong rồi mới vào onboarding.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { onboardingStep, loading: spaceLoading, refresh } = useSpace();
  const [message, setMessage] = useState('Đang đăng nhập bằng Google…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const oauthErr = mapOAuthError(searchParams);
      if (oauthErr) {
        if (!cancelled) {
          setFailed(true);
          setMessage(oauthErr);
        }
        setTimeout(() => navigate('/login', { replace: true }), 3500);
        return;
      }

      const code = searchParams.get('code');

      // detectSessionInUrl có thể đã đổi code → ưu tiên getSession trước
      let { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if ((!data.session || error) && code) {
        const exch = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exch.error) {
          setFailed(true);
          setMessage(exch.error.message || 'Không đổi được mã đăng nhập Google.');
          setTimeout(() => navigate('/login', { replace: true }), 2800);
          return;
        }
        data = exch.data;
      }

      if (!data?.session) {
        setFailed(true);
        setMessage('Đăng nhập Google chưa thành công. Thử lại hoặc dùng email nhé.');
        setTimeout(() => navigate('/login', { replace: true }), 2200);
        return;
      }

      await refresh();
      if (cancelled) return;
      clearOAuthNext();
      setMessage('Đăng nhập thành công, đang vào Space…');
    }

    finish();
    return () => {
      cancelled = true;
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
