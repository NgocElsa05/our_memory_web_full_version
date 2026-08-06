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
import { pendingInvitePath, savePendingInvite } from '../../lib/invite';
import { LOADING_COPY } from '../../lib/loadingCopy';

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invite = params.get('invite') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (invite) savePendingInvite(invite);

  const afterAuthPath = () => pendingInvitePath() || '/onboarding/space';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (invite) savePendingInvite(invite);
      const data = await signInWithEmail(email.trim(), password);
      if (!data.session) {
        setError('Vào hộp thư và bấm link xác nhận giúp mình nha.');
        return;
      }
      // PublicOnly cũng tôn trọng pending invite — về /invite chứ không tạo space
      navigate(afterAuthPath(), { replace: true });
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
      const inviteTo = pendingInvitePath();
      await signInWithGoogle(inviteTo || '/');
    } catch (err) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Chào mừng trở lại"
      footer={
        <p>
          Chưa có tài khoản?{' '}
          <Link
            to={invite ? `/signup?invite=${encodeURIComponent(invite)}` : '/signup'}
            className="font-black text-gray-700"
          >
            Tạo tài khoản
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
        <Field label="Mật khẩu">
          <input
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="submit" className={primaryBtnClass} disabled={loading}>
          {loading ? LOADING_COPY.AO_LOGIN : 'Đăng nhập'}
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
