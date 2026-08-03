import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout, {
  Field,
  ErrorBox,
  inputClass,
  primaryBtnClass,
} from '../../components/auth/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../supabase';
import { generateInviteCode } from '../../lib/invite';

export default function CreateSpace() {
  const { user, signOut } = useAuth();
  const { refresh, member } = useSpace();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (member) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Đặt tên cho không gian của hai bạn nhé.');
      return;
    }
    if (!user) {
      setError('Bạn cần đăng nhập trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const invite_code = generateInviteCode();
      const { data: space, error: spaceErr } = await supabase
        .from('spaces')
        .insert([
          {
            name: trimmed,
            invite_code,
            created_by: user.id,
            theme_key: null,
            met_on: null,
            together_since: null,
          },
        ])
        .select('*')
        .single();
      if (spaceErr) throw spaceErr;

      const { error: memErr } = await supabase.from('members').insert([
        {
          space_id: space.id,
          auth_user_id: user.id,
          role: 'user_1',
        },
      ]);
      if (memErr) throw memErr;

      await refresh();
      navigate('/onboarding/dates', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không tạo được Space, thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đặt tên Space"
      subtitle="Không gian riêng của đúng hai bạn"
    >
      <ErrorBox message={error} />
      <form onSubmit={onSubmit}>
        <Field label="Tên Space" hint='Ví dụ: “Chúng mình”, “Nhà nhỏ”…'>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chúng mình"
            autoFocus
            maxLength={60}
          />
        </Field>
        <button type="submit" className={primaryBtnClass} disabled={loading}>
          {loading ? 'Đang tạo…' : 'Tiếp tục'}
        </button>
      </form>
      <button
        type="button"
        className="mt-4 w-full text-xs font-bold text-gray-400 hover:text-[var(--om-primary)]"
        onClick={async () => {
          await signOut();
          navigate('/welcome', { replace: true });
        }}
      >
        Không phải bạn? Đăng xuất
      </button>
    </AuthLayout>
  );
}
