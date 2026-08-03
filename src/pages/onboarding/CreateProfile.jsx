import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout, {
  Field,
  ErrorBox,
  inputClass,
  primaryBtnClass,
} from '../../components/auth/AuthLayout';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../supabase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { prepareImageFileForUpload } from '../../lib/resizeImageForUpload';

export default function CreateProfile() {
  const { member, space, refresh, profile } = useSpace();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (profile) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const nick = nickname.trim();
    if (!nick) {
      setError('Cần một biệt danh để mọi người nhận ra bạn.');
      return;
    }
    if (!member || !space) {
      setError('Chưa có thành viên / Space.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let avatar_url = null;
      if (avatarFile) {
        try {
          const prepared = await prepareImageFileForUpload(avatarFile);
          const { secureUrl } = await uploadToCloudinary(
            prepared,
            `spaces/${space.id}/profiles`,
            'avatar.jpg'
          );
          avatar_url = secureUrl;
        } catch (upErr) {
          console.error(upErr);
          setError('Không up được ảnh; bạn vẫn có thể lưu hồ sơ không avatar — thử lại hoặc bỏ chọn ảnh.');
          // cho phép tiếp tục không avatar nếu user muốn — ở đây dừng để họ quyết
          setLoading(false);
          return;
        }
      }

      const { error: insErr } = await supabase.from('profiles').insert([
        {
          id: member.id,
          space_id: space.id,
          nickname: nick,
          full_name: fullName.trim() || null,
          avatar_url,
        },
      ]);
      if (insErr) throw insErr;

      await supabase.from('members').update({ nickname: nick }).eq('id', member.id);

      await refresh();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Không lưu được hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Hồ sơ của bạn" subtitle="Biệt danh là bắt buộc; ảnh đại diện tùy chọn">
      <ErrorBox message={error} />
      <form onSubmit={onSubmit}>
        <Field label="Biệt danh *">
          <input
            className={inputClass}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Tên hay gọi ở nhà"
            autoFocus
            maxLength={40}
            required
          />
        </Field>
        <Field label="Tên đầy đủ">
          <input
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tuỳ chọn"
            maxLength={80}
          />
        </Field>
        <Field label="Ảnh đại diện">
          <input
            type="file"
            accept="image/*"
            className="w-full text-sm font-semibold text-gray-600"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          />
        </Field>
        <button type="submit" className={primaryBtnClass} disabled={loading}>
          {loading ? 'Đang lưu…' : 'Vào Space'}
        </button>
      </form>
    </AuthLayout>
  );
}
