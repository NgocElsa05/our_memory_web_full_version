import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout, { primaryBtnClass } from '../../components/auth/AuthLayout';
import { useSpace } from '../../context/SpaceContext';
import { formatViDate } from '../../lib/invite';
import { getThemeByKey } from '../../lib/themes';

export default function SpacePreview() {
  const { space, markPreviewDone, member } = useSpace();
  const navigate = useNavigate();

  if (member?.role === 'user_1') {
    return <Navigate to="/" replace />;
  }

  const theme = space?.theme_key ? getThemeByKey(space.theme_key) : null;

  const continueNext = () => {
    if (space?.id) markPreviewDone(space.id);
    navigate('/onboarding/profile', { replace: true });
  };

  return (
    <AuthLayout title="Chào mừng vào Space" subtitle="Đây là không gian hai bạn sẽ dùng chung">
      {!space ? (
        <p className="text-sm font-semibold text-gray-500 text-center">Đang tải…</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl om-field border border-gray-200 p-4">
            <p className="text-2xl font-black text-gray-800">{space.name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400 font-bold">Ngày bắt đầu yêu</dt>
                <dd className="font-black">{formatViDate(space.together_since)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400 font-bold">Ngày quen</dt>
                <dd className="font-black">{formatViDate(space.met_on)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-400 font-bold">Theme</dt>
                <dd className="font-black">{theme?.name || 'Chưa chọn'}</dd>
              </div>
            </dl>
            {theme && (
              <div className="mt-3 flex gap-1">
                {theme.colors.map((c) => (
                  <span key={c} className="h-6 flex-1 rounded-md border border-black/5" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>
          <button type="button" className={primaryBtnClass} onClick={continueNext}>
            Tạo hồ sơ của mình
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
