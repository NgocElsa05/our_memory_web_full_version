import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout, {
  Field,
  ErrorBox,
  inputClass,
  primaryBtnClass,
  ghostBtnClass,
  mapAuthError,
} from '../../components/auth/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { savePendingInvite } from '../../lib/invite';

export default function Signup() {
  const { signUpWithEmail, signInWithEmail, signInWithGoogle } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invite = params.get('invite') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (invite) savePendingInvite(invite);

  const goNext = () => {
    navigate(invite ? `/invite/${encodeURIComponent(invite)}` : '/onboarding/space', {
      replace: true,
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Hai mật khẩu chưa khớp nhau.');
      return;
    }

    const trimmed = email.trim();
    setLoading(true);
    try {
      const data = await signUpWithEmail(trimmed, password);

      // Confirm email tắt → thường có session ngay. Nếu không (user đã tồn tại / cấu hình khác) → đăng nhập luôn.
      if (data.session) {
        goNext();
        return;
      }

      try {
        const signedIn = await signInWithEmail(trimmed, password);
        if (signedIn.session) {
          goNext();
          return;
        }
      } catch (signInErr) {
        const msg = (signInErr?.message || '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials')) {
          setError('Email này đã được dùng rồi. Bạn hãy thử đăng nhập nhé.');
          return;
        }
        throw signInErr;
      }

      setError('Không tạo được phiên đăng nhập. Thử Đăng nhập giúp nhé.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      if (invite) savePendingInvite(invite);
      await signInWithGoogle(invite ? `/invite/${invite}` : '/onboarding/space');
    } catch (err) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle={invite ? 'Bạn đang tham gia bằng lời mời' : 'Bắt đầu không gian của hai bạn'}
      footer={
        <p>
          Đã có tài khoản?{' '}
          <Link
            to={invite ? `/login?invite=${encodeURIComponent(invite)}` : '/login'}
            className="font-black text-gray-700"
          >
            Đăng nhập
          </Link>
        </p>
      }
    >
      <ErrorBox message={error} />

      <form onSubmit={onSubmit}>
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Mật khẩu" hint="Ít nhất 8 ký tự">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Nhập lại mật khẩu">
          <input
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <button type="submit" className={primaryBtnClass} disabled={loading}>
          {loading ? 'Đang tạo…' : 'Tiếp tục'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-300">
        <div className="flex-1 h-px bg-gray-200" />
        hoặc
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button type="button" className={ghostBtnClass} onClick={onGoogle} disabled={loading}>
        Tiếp tục với Google
      </button>
    </AuthLayout>
  );
}
