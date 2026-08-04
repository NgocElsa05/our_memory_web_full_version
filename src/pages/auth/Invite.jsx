import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthLayout, {
  ErrorBox,
  primaryBtnClass,
  ghostBtnClass,
} from '../../components/auth/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../supabase';
import {
  clearPendingInvite,
  formatViDate,
  savePendingInvite,
} from '../../lib/invite';
import { getThemeByKey } from '../../lib/themes';

export default function Invite() {
  const { inviteCode } = useParams();
  const code = (inviteCode || '').trim();
  const { user } = useAuth();
  const { member, refresh, onboardingStep } = useSpace();
  const navigate = useNavigate();

  const [space, setSpace] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (code) savePendingInvite(code);
  }, [code]);

  useEffect(() => {
    if (onboardingStep === 'ready') {
      navigate('/', { replace: true });
    }
  }, [onboardingStep, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const normalized = code.toUpperCase();
        const { data, error: err } = await supabase
          .from('spaces')
          .select('id, name, met_on, together_since, theme_key, invite_code')
          .eq('invite_code', normalized)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          if (!cancelled) {
            setSpace(null);
            setError(
              'Không tìm thấy Space với mã này. Kiểm tra: (1) chạy scripts/sql_spaces_invite_select.sql trên Supabase, (2) Space chưa bị xóa/rời hết, (3) copy đúng link từ Cài đặt.'
            );
          }
          return;
        }
        const { count, error: cErr } = await supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', data.id);
        if (!cancelled) {
          setSpace(data);
          // RLS có thể chặn count — không fail cả trang
          setMemberCount(cErr ? 0 : count || 0);
          if (!cErr && (count || 0) >= 2) {
            setError('Chỗ này đã đủ hai tình yêu rồi.');
          }
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e.message?.includes('permission') || e.code === '42501'
              ? 'Tạm thời chưa xem được lời mời — chạy scripts/sql_spaces_invite_select.sql trên Supabase rồi thử lại.'
              : e.message || 'Không tải được lời mời.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (code) load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const join = async () => {
    if (!user || !space) return;
    if (member) {
      if (member.space_id === space.id) {
        clearPendingInvite();
        navigate('/onboarding/space-preview', { replace: true });
        return;
      }
      setError('Bạn đang ở trong Space rồi. Hiện tại mỗi tài khoản chỉ tạo được một Space thôii.');
      return;
    }
    if (memberCount >= 2) {
      setError('Chỗ này đã đủ hai tình yêu rồi.');
      return;
    }

    setJoining(true);
    setError('');
    try {
      const { error: insErr } = await supabase.from('members').insert([
        {
          space_id: space.id,
          auth_user_id: user.id,
          role: 'user_2',
        },
      ]);
      if (insErr) throw insErr;
      clearPendingInvite();
      await refresh();
      navigate('/onboarding/space-preview', { replace: true });
    } catch (e) {
      console.error(e);
      if (e.message?.includes('members_space_role') || e.code === '23505') {
        setError('Chỗ này đã đủ hai tình yêu rồi.');
      } else {
        setError(e.message || 'Không tham gia được, thử lại nhé.');
      }
    } finally {
      setJoining(false);
    }
  };

  const theme = space?.theme_key ? getThemeByKey(space.theme_key) : null;

  return (
    <AuthLayout title="Lời mời vào Space" subtitle={code ? `Mã: ${code}` : ''}>
      <ErrorBox message={error} />
      {loading && <p className="text-sm font-semibold text-gray-500 text-center">Đang tải…</p>}

      {!loading && space && (
        <div className="space-y-4">
          <div className="rounded-2xl om-field border border-gray-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Tên Space</p>
            <p className="text-xl font-black text-gray-800">{space.name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400 font-bold">Ngày bắt đầu yêu</dt>
                <dd className="font-black text-gray-700">{formatViDate(space.together_since)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400 font-bold">Ngày quen</dt>
                <dd className="font-black text-gray-700">{formatViDate(space.met_on)}</dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-gray-400 font-bold">Theme</dt>
                <dd className="font-black text-gray-700">{theme ? theme.name : 'Chưa chọn'}</dd>
              </div>
            </dl>
            {theme && (
              <div className="mt-3 flex gap-1">
                {theme.colors.map((c) => (
                  <span
                    key={c}
                    className="h-6 flex-1 rounded-md border border-black/5"
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {!user ? (
            <div className="space-y-3">
              <Link
                to={`/signup?invite=${encodeURIComponent(code)}`}
                className={`${primaryBtnClass} block text-center`}
              >
                Tạo tài khoản để tham gia
              </Link>
              <Link
                to={`/login?invite=${encodeURIComponent(code)}`}
                className={`${ghostBtnClass} block text-center`}
              >
                Đã có tài khoản — Đăng nhập
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className={primaryBtnClass}
              onClick={join}
              disabled={joining || memberCount >= 2 || Boolean(error && !space)}
            >
              {joining ? 'Đang tham gia…' : `Tham gia “${space.name}”`}
            </button>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
