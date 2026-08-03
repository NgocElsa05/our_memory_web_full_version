import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout, {
  Field,
  ErrorBox,
  inputClass,
  primaryBtnClass,
  ghostBtnClass,
} from '../../components/auth/AuthLayout';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../supabase';

export default function OnboardingDates() {
  const { space, refresh, member } = useSpace();
  const navigate = useNavigate();
  const [togetherSince, setTogetherSince] = useState(space?.together_since || '');
  const [metOn, setMetOn] = useState(space?.met_on || '');
  const [skipMet, setSkipMet] = useState(!space?.met_on);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (member?.role === 'user_2') {
    return <Navigate to="/onboarding/space-preview" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!togetherSince) {
      setError('Cần ngày bắt đầu yêu để mình đếm được các bạn đã bên nhau bao lâu rồi nè.');
      return;
    }
    const met = skipMet ? null : metOn || null;
    if (met && togetherSince < met) {
      setError('Ngày bắt đầu yêu nên từ ngày biết nhau trở đi, chỉnh lại giúp nhé.');
      return;
    }
    if (!space) {
      setError('Chưa có Space.');
      return;
    }

    setLoading(true);
    try {
      const { error: updErr } = await supabase
        .from('spaces')
        .update({ together_since: togetherSince, met_on: met })
        .eq('id', space.id);
      if (updErr) throw updErr;
      await refresh();
      navigate('/onboarding/theme', { replace: true });
    } catch (err) {
      setError(err.message || 'Không lưu được ngày, thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Những ngày đặc biệt"
      subtitle="Ngày bắt đầu yêu dùng để đếm các bạn đã bên nhau bao lâu"
    >
      <ErrorBox message={error} />
      <form onSubmit={onSubmit}>
        <Field label="Ngày bắt đầu yêu nhau *" hint="Bắt buộc — để tính số ngày bên nhau">
          <input
            type="date"
            required
            className={inputClass}
            value={togetherSince}
            onChange={(e) => setTogetherSince(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Field label="Ngày quen nhau">
          <input
            type="date"
            className={inputClass}
            value={metOn}
            disabled={skipMet}
            onChange={(e) => setMetOn(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <button
          type="button"
          className={`${ghostBtnClass} mb-4`}
          onClick={() => {
            setSkipMet((v) => !v);
            if (!skipMet) setMetOn('');
          }}
        >
          {skipMet ? 'Nhập ngày quen' : 'Để sau — chưa nhớ ngày quen'}
        </button>

        <button type="submit" className={primaryBtnClass} disabled={loading}>
          {loading ? 'Đang lưu…' : 'Tiếp tục'}
        </button>
      </form>
    </AuthLayout>
  );
}
