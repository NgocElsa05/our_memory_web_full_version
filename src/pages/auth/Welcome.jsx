import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { primaryBtnClass, ghostBtnClass, inputClass, Field } from '../../components/auth/AuthLayout';
import { savePendingInvite } from '../../lib/invite';

export default function Welcome() {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const goInvite = (e) => {
    e.preventDefault();
    const code = inviteCode.trim();
    if (!code) return;
    savePendingInvite(code);
    navigate(`/invite/${encodeURIComponent(code)}`);
  };

  return (
    <AuthLayout
      title="Chào mừng đến với thế giới của hai bạn"
      subtitle="Đăng nhập hoặc tạo không gian kỷ niệm riêng"
      footer={
        <p className="text-xs text-gray-400 font-medium">Email / Google · tối đa 2 người mỗi Space</p>
      }
    >
      <div className="space-y-3">
        <Link to="/signup" className={`${primaryBtnClass} block text-center`}>
          Tạo tài khoản
        </Link>
        <Link to="/login" className={`${ghostBtnClass} block text-center`}>
          Đăng nhập
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        {!showInvite ? (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="w-full text-sm font-bold text-gray-600 hover:underline"
          >
            Có lời mời?
          </button>
        ) : (
          <form onSubmit={goInvite}>
            <Field label="Mã mời">
              <input
                className={inputClass}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="VD: AB12CD34"
                autoFocus
              />
            </Field>
            <button type="submit" className={primaryBtnClass} disabled={!inviteCode.trim()}>
              Mở lời mời
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
