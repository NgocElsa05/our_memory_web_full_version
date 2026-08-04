import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { useProfileNicknames } from '../hooks/useProfiles';
import { uploadToCloudinary } from '../lib/cloudinary';
import { prepareImageFileForUpload } from '../lib/resizeImageForUpload';
import { cloudinaryAvatar, cloudinaryThumb } from '../lib/cloudinaryUrl';
import { notifyPartner } from '../lib/push';
import {
  ShieldCheck, ShieldAlert, Send,
  Edit2, Check, Star, X, Trash2,
  Camera, UserRoundPlus,
} from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';

const PARTNER_PENDING_ID = '__partner_pending__';

// ─────────────────────────────────────────────
// MOODBOARD CONFIG
// layout: vị trí trong CSS grid (row / col / span)
// ─────────────────────────────────────────────
const GRID_CELLS = [
  { key: 'mbti',           label: 'MBTI',        gridArea: '1 / 1 / 2 / 2' },
  { key: 'fav_food',       label: 'Food',         gridArea: '1 / 2 / 2 / 3' },
  { key: 'character',      label: 'Character',    gridArea: '1 / 3 / 2 / 4' },
  { key: 'fav_color',      label: 'Color',        gridArea: '1 / 4 / 2 / 5' },
  { key: 'fav_place',      label: 'Place',        gridArea: '2 / 1 / 3 / 2' },
  // center selfie: row 2-3, col 2-4  (avatar_url)
  { key: 'fav_season',     label: 'Season',       gridArea: '2 / 4 / 3 / 5' },
  { key: 'hobbies',        label: 'Hobby',        gridArea: '3 / 1 / 4 / 2' },
  { key: 'fav_music_genre',label: 'Music',        gridArea: '3 / 4 / 4 / 5' },
  { key: 'career_path',    label: 'Career',       gridArea: '4 / 1 / 5 / 2' },
  { key: 'fav_flower',     label: 'Flower',       gridArea: '4 / 2 / 5 / 3' },
  { key: 'fav_animal',     label: 'Animal',       gridArea: '4 / 3 / 5 / 4' },
  { key: 'fav_app_or_game',label: 'App/Game',     gridArea: '4 / 4 / 5 / 5' },
];

// ─────────────────────────────────────────────
// SUB: 1 Ô MOODBOARD
// ─────────────────────────────────────────────
const MoodCell = ({ cellKey, label, imageUrl, editing, onPickFile, uploading }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (editing) inputRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickFile(cellKey, file);
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      style={{ gridArea: GRID_CELLS.find(c => c.key === cellKey)?.gridArea }}
      className={`relative overflow-hidden border border-white/60 bg-white/20 transition-all
        ${editing ? 'cursor-pointer hover:brightness-90 active:scale-95' : ''}`}
    >
      {imageUrl ? (
        <img src={cloudinaryThumb(imageUrl, 320)} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-black/10">
          {editing && <Camera size={18} className="opacity-70" />}
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        </div>
      )}

      {imageUrl && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 px-1.5">
          <span className="text-[9px] font-black text-white uppercase tracking-wider">{label}</span>
        </div>
      )}

      {uploading === cellKey && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center px-2">
          <p className="text-[10px] font-black text-white text-center leading-snug">
            {LOADING_COPY.AP_MOOD}
          </p>
        </div>
      )}

      {editing && imageUrl && (
        <div className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
          <Camera size={10} className="text-white" />
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────
const Discovery = () => {
  const { sessionUserId, spaceId, members, partnerId } = useSession();
  const queryClient = useQueryClient();
  const { tabNames: nickByMemberId } = useProfileNicknames();

  /** Luôn 2 tab: mình + partner (hoặc slot chờ khi partner chưa join). */
  const profileTabs = useMemo(() => {
    const self = (members || []).find((m) => m.id === sessionUserId);
    const other =
      (members || []).find((m) => m.id === partnerId) ||
      (members || []).find((m) => m.id !== sessionUserId) ||
      null;

    const tabs = [];
    if (self) {
      tabs.push({
        id: self.id,
        label: nickByMemberId[self.id] || (self.role === 'user_1' ? 'Thành viên 1' : 'Thành viên 2'),
        pending: false,
      });
    }
    if (other) {
      tabs.push({
        id: other.id,
        label: nickByMemberId[other.id] || (other.role === 'user_1' ? 'Thành viên 1' : 'Thành viên 2'),
        pending: false,
      });
    } else {
      tabs.push({
        id: PARTNER_PENDING_ID,
        label: 'Partner',
        pending: true,
      });
    }
    return tabs;
  }, [members, sessionUserId, partnerId, nickByMemberId]);

  const [activeMemberId, setActiveMemberId] = useState(() => sessionUserId || null);
  useEffect(() => {
    if (!activeMemberId && sessionUserId) setActiveMemberId(sessionUserId);
  }, [sessionUserId, activeMemberId]);

  // Partner vừa join / đổi id → thoát slot pending
  useEffect(() => {
    if (activeMemberId === PARTNER_PENDING_ID && partnerId) {
      setActiveMemberId(partnerId);
    }
  }, [partnerId, activeMemberId]);

  const isPartnerPending = activeMemberId === PARTNER_PENDING_ID;
  const currentId = isPartnerPending ? null : (activeMemberId || sessionUserId);
  const isOwnProfile = Boolean(currentId && currentId === sessionUserId);
  const canEditProfile = isOwnProfile && !isPartnerPending;
  const subjectNickname = (currentId && nickByMemberId[currentId]) || 'người ấy';
  const partnerNickname = useMemo(() => {
    if (isPartnerPending) return 'Partner';
    if (isOwnProfile) return nickByMemberId[partnerId] || 'Partner';
    return nickByMemberId[sessionUserId] || 'Bạn';
  }, [isPartnerPending, isOwnProfile, nickByMemberId, partnerId, sessionUserId]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadingCell, setUploadingCell] = useState(null);

  const [newFact, setNewFact] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile-full', currentId],
    enabled: Boolean(currentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentId)
        .maybeSingle();
      if (error) throw error;
      return data ?? {};
    },
  });

  const discoveriesQuery = useQuery({
    queryKey: ['discoveries', spaceId, currentId],
    enabled: Boolean(currentId && spaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_discoveries')
        .select('*, discovery_comments(*)')
        .eq('space_id', spaceId)
        .eq('subject_id', currentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = profileQuery.data ?? {};
  const discoveries = discoveriesQuery.data ?? [];
  const isBusy =
    loading ||
    (profileQuery.isPending && profileQuery.fetchStatus !== 'idle') ||
    (discoveriesQuery.isPending && discoveriesQuery.fetchStatus !== 'idle');

  useEffect(() => {
    if (profileQuery.data && !editingProfile) {
      setEditForm(profileQuery.data);
    }
  }, [profileQuery.data, editingProfile]);

  const refetchDiscoveries = () =>
    queryClient.invalidateQueries({ queryKey: ['discoveries', spaceId, currentId] });

  const refetchProfileFull = () =>
    queryClient.invalidateQueries({ queryKey: ['profile-full', currentId] });

  const handleSaveProfile = async () => {
    if (!currentId || !canEditProfile) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: editForm.nickname,
        full_name: editForm.full_name,
        birthday: editForm.birthday,
        age: editForm.age,
        gender: editForm.gender,
        zodiac: editForm.zodiac,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentId);
    if (!error) {
      setEditingProfile(false);
      await queryClient.invalidateQueries({ queryKey: ['profiles', spaceId] });
      await refetchProfileFull();
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  const handleCellUpload = async (cellKey, file) => {
    if (!currentId || !spaceId || !canEditProfile) return;
    setUploadingCell(cellKey);
    try {
      const prepared = await prepareImageFileForUpload(file, {
        maxEdge: 1600,
        maxBytesBeforeProcess: 450 * 1024,
      });
      const name = prepared.name || (file instanceof File && file.name) || 'profile.jpg';
      const { secureUrl } = await uploadToCloudinary(
        prepared,
        `spaces/${spaceId}/profiles`,
        name
      );
      const colName = cellKey === 'avatar' ? 'avatar_url' : cellKey;
      await supabase.from('profiles').update({ [colName]: secureUrl }).eq('id', currentId);
      await queryClient.invalidateQueries({ queryKey: ['profiles', spaceId] });
      await refetchProfileFull();
    } catch (err) {
      alert('Lỗi upload: ' + err.message);
    }
    setUploadingCell(null);
  };

  const addFact = async (e) => {
    e.preventDefault();
    if (!newFact.trim() || !sessionUserId || !currentId || !spaceId) return;
    setLoading(true);
    const { error } = await supabase.from('partner_discoveries').insert([
      {
        content: newFact,
        author_id: sessionUserId,
        subject_id: currentId,
        space_id: spaceId,
        category: 'Đặc biệt',
      },
    ]);
    if (error) alert(error.message);
    else {
      if (currentId !== sessionUserId) {
        void notifyPartner({
          targetMemberId: currentId,
          title: 'Phát hiện mới ✨',
          body: `${nickByMemberId[sessionUserId] || 'Partner'} vừa viết điều gì đó về bạn`,
          url: '/discovery',
          tag: 'discovery',
        });
      }
    }
    setNewFact('');
    await refetchDiscoveries();
    setLoading(false);
  };

  const handleSubmitComment = async (factId) => {
    if (!replyText.trim() || !sessionUserId || !spaceId) return;
    setLoading(true);
    const finalContent = `[${replyingTo.type}] ${replyText}`;
    const { error } = await supabase.from('discovery_comments').insert([
      {
        discovery_id: factId,
        author_id: sessionUserId,
        content: finalContent,
        space_id: spaceId,
      },
    ]);
    if (!error) {
      setReplyingTo(null);
      setReplyText('');
      await refetchDiscoveries();
      const fact = discoveries.find((d) => d.id === factId);
      if (fact) {
        const target =
          fact.author_id === sessionUserId ? fact.subject_id : fact.author_id;
        if (target && target !== sessionUserId) {
          void notifyPartner({
            targetMemberId: target,
            title: 'Comment mới 💬',
            body: `${nickByMemberId[sessionUserId] || 'Partner'} vừa phản hồi một phát hiện`,
            url: '/discovery',
            tag: 'discovery-comment',
          });
        }
      }
    } else alert('Lỗi: ' + error.message);
    setLoading(false);
  };

  const handleDeleteDiscovery = async (id) => {
    if (!window.confirm('Xóa phát hiện này nhé?')) return;
    await supabase.from('partner_discoveries').delete().eq('id', id);
    void refetchDiscoveries();
  };

  const handleDeleteComment = async (id) => {
    await supabase.from('discovery_comments').delete().eq('id', id);
    void refetchDiscoveries();
  };

  const displayName = profiles.full_name || profiles.nickname || subjectNickname;
  const authorLabel = (id) => nickByMemberId[id] || 'Ai đó';

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');
        .font-script { font-family: 'Pinyon Script', cursive; }
        .text-white-stroke { color: white !important; -webkit-text-stroke: 0.6px black; paint-order: stroke fill; }
        .moodboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(4, 1fr);
          aspect-ratio: 1 / 1;
          gap: 2px;
        }
        .cell-center {
          grid-area: 2 / 2 / 4 / 4;
          position: relative;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.6);
          cursor: pointer;
        }
      `}</style>

      <div className="flex om-surface p-1.5 rounded-[25px] mb-8 shadow-inner border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]">
        {profileTabs.map((tab) => {
          const active = activeMemberId === tab.id || (!activeMemberId && tab.id === sessionUserId);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveMemberId(tab.id);
                setEditingProfile(false);
              }}
              className={`flex-1 py-4 rounded-[20px] text-xs font-black transition-all ${
                active ? 'bg-white text-[var(--om-primary)] shadow-md' : 'text-[var(--om-primary-soft)]'
              }`}
            >
              Góc của {tab.label}
            </button>
          );
        })}
      </div>

      {isPartnerPending && (
        <section className="p-10 rounded-[40px] mb-10 bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] shadow-sm text-center">
          <div
            className="inline-flex p-4 rounded-full mb-4"
            style={{ background: 'color-mix(in srgb, var(--om-primary-soft) 30%, transparent)' }}
          >
            <UserRoundPlus size={28} style={{ color: 'var(--om-primary)' }} />
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-2">Partner chưa vào Space</h2>
          <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto mb-6">
            Khi người ấy join bằng link mời, góc profile + moodboard của họ sẽ hiện ở đây để bạn xem và viết phát hiện.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--om-on-primary)]"
            style={{ background: 'var(--om-primary)' }}
          >
            Lấy link mời trong Cài đặt
          </Link>
        </section>
      )}

      {/* ── BANNER PROFILE ── */}
      {!isPartnerPending && (
      <section
        className="p-6 rounded-[40px] mb-10 shadow-2xl shadow-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--om-primary) 0%, var(--om-lavender) 100%)',
          color: 'var(--om-on-primary)',
        }}
      >
        {/* Nút Edit / Save — chỉ profile của mình */}
        {canEditProfile && (
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={() => editingProfile ? handleSaveProfile() : setEditingProfile(true)}
            className="bg-white/90 backdrop-blur text-[var(--om-primary)] p-2.5 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all"
          >
            {editingProfile ? <Check size={18} /> : <Edit2 size={18} />}
          </button>
        </div>
        )}

        {/* ── TÊN + INFO ── */}
        <div className="mb-5 text-left">
          {editingProfile ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Tên / Nickname</label>
                <input
                  value={editForm.nickname || ''}
                  onChange={e => setEditForm({ ...editForm, nickname: e.target.value })}
                  placeholder="Tên gọi..."
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none font-black text-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Tên đầy đủ</label>
                <input
                  value={editForm.full_name || ''}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Họ và tên..."
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Ngày sinh (text)</label>
                <input
                  value={editForm.birthday || ''}
                  onChange={e => setEditForm({ ...editForm, birthday: e.target.value })}
                  placeholder="VD: 22/03 hoặc 14/4"
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Tuổi</label>
                <input
                  value={editForm.age || ''}
                  onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                  placeholder="VD: 21"
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Giới tính</label>
                <input
                  value={editForm.gender || ''}
                  onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                  placeholder="female / male..."
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-80">Cung hoàng đạo</label>
                <input
                  value={editForm.zodiac || ''}
                  onChange={e => setEditForm({ ...editForm, zodiac: e.target.value })}
                  placeholder="VD: libra"
                  className="om-field w-full border border-black/10 px-4 py-2.5 rounded-2xl outline-none text-sm"
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-script text-6xl drop-shadow-lg mb-2 leading-none">
                {displayName}
              </h1>
              <div className="flex items-center gap-3 flex-wrap opacity-90">
                {profiles.age     && <span className="font-black text-sm">{profiles.age}</span>}
                {profiles.gender  && <span className="font-medium text-sm">{profiles.gender}</span>}
                {profiles.zodiac  && <span className="font-medium text-sm">{profiles.zodiac}</span>}
                {profiles.birthday && (
                  <span className="text-xs font-medium italic opacity-80">🎂 {profiles.birthday}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── MOODBOARD GRID ── */}
        <div className="moodboard-grid rounded-2xl overflow-hidden">
          {/* Ô thường */}
          {GRID_CELLS.map(cell => (
            <MoodCell
              key={cell.key}
              cellKey={cell.key}
              label={cell.label}
              imageUrl={profiles[cell.key]}
              editing={editingProfile && canEditProfile}
              onPickFile={(key, f) => handleCellUpload(key, f)}
              uploading={uploadingCell}
            />
          ))}

          {/* Ô center (selfie) - avatar_url */}
          <div className="cell-center">
            {profiles.avatar_url ? (
              <img src={cloudinaryAvatar(profiles.avatar_url, 480)} alt="Avatar" className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/10 gap-2">
                {editingProfile && canEditProfile && <Camera size={28} className="opacity-60" />}
                <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Ảnh chính</span>
              </div>
            )}

            {/* Spinner */}
            {uploadingCell === 'avatar_url' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center px-3">
                <p className="text-xs font-black text-white text-center">
                  {LOADING_COPY.AP_DISCOVERY}
                </p>
              </div>
            )}

            {editingProfile && canEditProfile && (
              <label className="absolute inset-0 cursor-pointer">
                <div className="absolute bottom-2 right-2 bg-black/40 rounded-full p-1.5">
                  <Camera size={14} className="text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCellUpload('avatar_url', file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        </div>

      </section>
      )}

      {/* ── DISCOVERIES ── */}
      {!isPartnerPending && (
      <div className="text-left mb-10 px-2">
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <Star className="text-[var(--om-accent)] fill-[var(--om-accent)]" size={24} />
          Những điều {partnerNickname} phát hiện thêm...
        </h3>

        {!isOwnProfile ? (
        <form onSubmit={addFact} className="flex gap-3 mb-10">
          <input
            type="text"
            value={newFact}
            onChange={e => setNewFact(e.target.value)}
            placeholder={`Bạn thấy điều gì đặc biệt ở ${profiles.nickname || subjectNickname}?`}
            className="om-field flex-1 p-5 border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] rounded-[25px] focus:border-[var(--om-primary)] outline-none shadow-sm text-sm"
          />
          <button
            type="submit"
            disabled={isBusy || editingProfile}
            className="bg-[var(--om-primary)] text-[var(--om-on-primary)] p-5 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send size={22} />
          </button>
        </form>
        ) : (
          <p className="text-sm text-gray-400 font-medium mb-8 italic">
            {partnerId
              ? 'Partner sẽ viết những điều họ thấy ở bạn tại đây.'
              : 'Khi Partner join Space, họ sẽ viết những điều họ thấy ở bạn tại đây.'}
          </p>
        )}

        <div className="space-y-6">
          {discoveries.map(fact => (
            <div
              key={fact.id}
              className="bg-white p-6 rounded-[35px] border border-[color-mix(in_srgb,var(--om-lavender)_30%,transparent)] shadow-sm hover:shadow-md transition-all group relative"
            >
              <button
                onClick={() => handleDeleteDiscovery(fact.id)}
                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>

              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-[var(--om-primary)] bg-[color-mix(in_srgb,var(--om-primary)_10%,transparent)] px-3 py-1 rounded-full uppercase italic tracking-tighter">
                  {authorLabel(fact.author_id)} bắt bài nè
                </span>
                <span className="text-[10px] text-gray-400 font-bold mr-8">
                  {new Date(fact.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <p className="text-gray-700 font-bold text-lg mb-4 italic leading-relaxed">"{fact.content}"</p>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  onClick={() => { setReplyingTo({ id: fact.id, type: 'CHUẨN RỒI' }); setReplyText(''); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase hover:bg-green-100 transition-colors"
                >
                  <ShieldCheck size={14} /> Chuẩn!
                </button>
                <button
                  onClick={() => { setReplyingTo({ id: fact.id, type: 'SAI NHA' }); setReplyText(''); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition-colors"
                >
                  <ShieldAlert size={14} /> Sai nha!
                </button>
              </div>

              {replyingTo?.id === fact.id && (
                <div className="mt-4 flex gap-2 om-surface p-2 rounded-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]">
                  <input
                    autoFocus
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitComment(fact.id); }}
                    placeholder={`Giải thích vì sao lại ${replyingTo.type}...`}
                    className="om-field flex-1 px-4 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--om-primary)_10%,transparent)]"
                  />
                  <button
                    onClick={() => handleSubmitComment(fact.id)}
                    disabled={isBusy}
                    className="bg-[var(--om-primary)] text-[var(--om-on-primary)] px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Gửi
                  </button>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 px-2 hover:text-rose-500">
                    <X size={16} />
                  </button>
                </div>
              )}

              {fact.discovery_comments?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-50 space-y-3">
                  {fact.discovery_comments.map(cmt => (
                    <div
                      key={cmt.id}
                      className="om-field p-4 rounded-2xl text-xs border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)] relative group/cmt"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-black text-[var(--om-primary)]">{authorLabel(cmt.author_id)}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] text-gray-400 font-bold">
                            {new Date(cmt.created_at).toLocaleString('vi-VN')}
                          </span>
                          <button
                            onClick={() => handleDeleteComment(cmt.id)}
                            className="text-gray-300 hover:text-rose-400 opacity-0 group-hover/cmt:opacity-100 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 font-medium leading-relaxed">
                        {cmt.comment_text || cmt.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {discoveries.length === 0 && (
            <div className="py-12 text-center text-gray-400 italic text-sm">
              Chưa có khám phá nào cả... 🌸
            </div>
          )}
        </div>
      </div>
      )}

    </div>
  );
};

export default Discovery;