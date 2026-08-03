import { useState, useEffect } from 'react';
import { Heart, Disc, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfileAvatars } from '../hooks/useProfiles';
import { useGalleryMedia } from '../hooks/useGalleryMedia';
import { useSession } from '../context/SessionContext';
import { cloudinaryAvatar, cloudinaryThumb } from '../lib/cloudinaryUrl';
import { daysTogether, formatViDate } from '../lib/invite';

const Home = () => {
  const navigate = useNavigate();
  const { space } = useSession();
  const [currentSong, setCurrentSong] = useState(() => {
    return localStorage.getItem('currentSongTitle') || 'Đang tải giai điệu...';
  });

  const { data: galleryItems = [] } = useGalleryMedia();
  const latestPhoto = galleryItems[0] ?? null;
  const { avatars, labels: avatarLabels } = useProfileAvatars();
  const [emImgLoaded, setEmImgLoaded] = useState(false);
  const [anhImgLoaded, setAnhImgLoaded] = useState(false);

  const days = daysTogether(space?.together_since) ?? 0;
  const sinceLabel = space?.together_since
    ? `Since ${formatViDate(space.together_since)}`
    : 'Chưa chọn ngày yêu';

  useEffect(() => {
    setEmImgLoaded(false);
    setAnhImgLoaded(false);
  }, [avatars.em, avatars.anh]);

  useEffect(() => {
    const handleMusic = (e) => setCurrentSong(e.detail);
    window.addEventListener('musicChanged', handleMusic);
    return () => window.removeEventListener('musicChanged', handleMusic);
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-8 animate-fade-in font-sans p-4 pb-24 md:pb-8">
      <div
        className="bg-white rounded-[45px] p-8 md:p-10 shadow-xl border relative overflow-hidden text-center"
        style={{
          boxShadow: `0 20px 40px -15px var(--om-shadow)`,
          borderColor: 'color-mix(in srgb, var(--om-lavender) 40%, transparent)',
        }}
      >
        <div className="relative z-10 mb-8">
          <h2 className="text-xl font-black text-gray-800 mb-1 uppercase tracking-tighter">
            {space?.name || 'Our little world'}
          </h2>
          <p
            className="text-[9px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'color-mix(in srgb, var(--om-primary) 65%, transparent)' }}
          >
            {sinceLabel}
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 mb-6 relative z-10">
          <div
            className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 p-1 shadow-inner transition-transform hover:scale-105"
            style={{ borderColor: 'color-mix(in srgb, var(--om-accent) 45%, transparent)' }}
          >
            <div
              className="relative w-full h-full rounded-full overflow-hidden bg-gray-50 border shadow-sm"
              style={{ borderColor: 'color-mix(in srgb, var(--om-accent) 25%, transparent)' }}
            >
              {avatars.em ? (
                <>
                  {!emImgLoaded && (
                    <div
                      className="absolute inset-0 z-[1] flex items-center justify-center px-1 text-center text-[10px] font-bold leading-tight"
                      style={{ background: 'color-mix(in srgb, var(--om-accent) 12%, white)', color: 'color-mix(in srgb, var(--om-accent) 40%, white)' }}
                    >
                      <span className="line-clamp-3">{avatarLabels.em}</span>
                    </div>
                  )}
                  <img
                    src={cloudinaryAvatar(avatars.em, 224)}
                    alt={avatarLabels.em}
                    className={`relative z-0 h-full w-full object-cover ${emImgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setEmImgLoaded(true)}
                    onError={() => setEmImgLoaded(true)}
                  />
                </>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-bold leading-tight"
                  style={{ background: 'color-mix(in srgb, var(--om-accent) 12%, white)', color: 'color-mix(in srgb, var(--om-accent) 45%, white)' }}
                >
                  <span className="line-clamp-3">{avatarLabels.em}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <Heart size={48} style={{ color: 'var(--om-accent)', fill: 'var(--om-accent)' }} className="animate-pulse" />
            <div
              className="absolute inset-0 blur-xl -z-10 animate-pulse"
              style={{ background: 'color-mix(in srgb, var(--om-accent) 50%, transparent)' }}
            />
          </div>

          <div
            className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 p-1 shadow-inner transition-transform hover:scale-105"
            style={{ borderColor: 'color-mix(in srgb, var(--om-primary) 45%, transparent)' }}
          >
            <div
              className="relative w-full h-full rounded-full overflow-hidden bg-gray-50 border shadow-sm"
              style={{ borderColor: 'color-mix(in srgb, var(--om-primary) 25%, transparent)' }}
            >
              {avatars.anh ? (
                <>
                  {!anhImgLoaded && (
                    <div
                      className="absolute inset-0 z-[1] flex items-center justify-center px-1 text-center text-[10px] font-bold leading-tight"
                      style={{ background: 'color-mix(in srgb, var(--om-primary) 12%, white)', color: 'color-mix(in srgb, var(--om-primary) 40%, white)' }}
                    >
                      <span className="line-clamp-3">{avatarLabels.anh}</span>
                    </div>
                  )}
                  <img
                    src={cloudinaryAvatar(avatars.anh, 224)}
                    alt={avatarLabels.anh}
                    className={`relative z-0 h-full w-full object-cover ${anhImgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setAnhImgLoaded(true)}
                    onError={() => setAnhImgLoaded(true)}
                  />
                </>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-bold leading-tight"
                  style={{ background: 'color-mix(in srgb, var(--om-primary) 12%, white)', color: 'color-mix(in srgb, var(--om-primary) 45%, white)' }}
                >
                  <span className="line-clamp-3">{avatarLabels.anh}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-8 relative z-10">
          <span
            className="text-8xl font-black leading-none bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(to bottom, var(--om-primary), var(--om-lavender))',
            }}
          >
            {days}
          </span>
          <span
            className="text-xl font-black uppercase tracking-widest mb-1"
            style={{ color: 'var(--om-accent)' }}
          >
            Ngày
          </span>
        </div>

        <div
          className="p-4 rounded-[25px] flex items-center justify-between border group hover:bg-white transition-all cursor-default relative z-10"
          style={{
            background: 'color-mix(in srgb, var(--om-tint) 35%, #f8f9fd)',
            borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:rotate-180 transition-all duration-1000"
              style={{ color: 'var(--om-primary)', boxShadow: `0 2px 8px var(--om-shadow)` }}
            >
              <Disc size={20} className="animate-spin-slow" />
            </div>
            <div className="text-left">
              <p
                className="text-[8px] font-black uppercase tracking-widest"
                style={{ color: 'var(--om-primary-soft)' }}
              >
                Giai điệu hôm nay
              </p>
              <p className="text-xs font-bold text-gray-700 max-w-[140px] truncate">{currentSong}</p>
            </div>
          </div>
          <div className="flex gap-1 items-end h-5 mr-1">
            <div className="w-1 rounded-full h-full animate-[bounce_1s_infinite]" style={{ background: 'var(--om-primary)' }} />
            <div className="w-1 rounded-full h-3 animate-[bounce_1.2s_infinite] delay-75" style={{ background: 'var(--om-primary-soft)' }} />
            <div className="w-1 rounded-full h-5 animate-[bounce_0.8s_infinite] delay-150" style={{ background: 'var(--om-lavender)' }} />
          </div>
        </div>
      </div>

      <div
        onClick={() => navigate('/gallery')}
        className="bg-white p-5 rounded-[30px] border flex items-center gap-4 shadow-sm hover:shadow-lg transition-all relative z-10 cursor-pointer group active:scale-95"
        style={{ borderColor: 'color-mix(in srgb, var(--om-accent) 35%, transparent)' }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border shadow-inner"
          style={{
            background: 'color-mix(in srgb, var(--om-tint) 40%, #f8f9fd)',
            color: 'var(--om-primary)',
            borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
          }}
        >
          {latestPhoto ? (
            <img src={cloudinaryThumb(latestPhoto.file_url, 112)} alt="Latest memory" className="w-full h-full object-cover" />
          ) : (
            <Camera size={24} />
          )}
        </div>
        <div className="text-left flex-1 min-w-0">
          <h4 className="font-black text-gray-800 text-xs uppercase tracking-tight">Khoảnh khắc mới</h4>
          <p className="text-[10px] text-gray-400 font-medium truncate italic">
            {latestPhoto && latestPhoto.caption ? `"${latestPhoto.caption}"` : 'Cùng tạo thêm nhiều kỷ niệm nhé...'}
          </p>
        </div>
        <div className="transform group-hover:translate-x-1 transition-all" style={{ color: 'var(--om-primary-soft)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Home;
