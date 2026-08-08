import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Send, MailOpen, Inbox, SendHorizontal, Trash2, X, Heart } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { isLetterFromMe } from '../lib/loveLetterIdentity';
import { useProfileNicknames } from '../hooks/useProfiles';
import { notifyPartner } from '../lib/push';
import {
  useLoveLetters,
  LOVE_LETTERS_QUERY_KEY,
  suppressLoveLettersRealtime,
} from '../hooks/useLoveLetters';
import CuteLoader from '../components/CuteLoader';
import { LOADING_COPY } from '../lib/loadingCopy';

const ENV = {
  /** Phong bì đóng */
  body: 'var(--om-primary)',
  line: 'color-mix(in srgb, var(--om-primary) 62%, #2a2a2a)',
  /** Phong bì mở — lớp nền nhạt / mặt trước đậm (theo code hình khối) */
  openBack: 'color-mix(in srgb, var(--om-primary) 34%, white)',
  openBackLine: 'color-mix(in srgb, var(--om-primary) 48%, #d0a8a8)',
  openFront: 'var(--om-primary)',
  openFrontLine: 'color-mix(in srgb, var(--om-primary) 68%, #4a2a2a)',
  paper: '#fdf7ef',
  paperLine: '#e8dac5',
  heart: 'var(--om-envelope-heart, var(--om-lavender))',
};

/** Phong bì đóng — logic khối (chuẩn code bạn gửi), màu theo theme */
function ClosedEnvelopeIcon({ className = '' }) {
  const uid = useId().replace(/:/g, '');
  const clipId = `om-env-clip-${uid}`;

  return (
    <svg
      viewBox="0 0 400 260"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 6px 12px color-mix(in srgb, var(--om-primary) 28%, transparent))' }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="400" height="260" rx="14" ry="14" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="400" height="260" fill={ENV.body} rx="14" ry="14" />

      <g clipPath={`url(#${clipId})`}>
        <polygon
          points="-10,270 200,110 410,270"
          fill={ENV.body}
          stroke={ENV.line}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <polygon
          points="-10,-10 200,150 410,-10"
          fill={ENV.body}
          stroke={ENV.line}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>

      <rect
        x="2"
        y="2"
        width="396"
        height="256"
        fill="none"
        stroke={ENV.line}
        strokeWidth="4"
        rx="12"
        ry="12"
      />

      <g transform="translate(200, 135) scale(1.3)">
        <path
          d="M0,15 C0,15 -18,2 -18,-10 C-18,-20 -6,-24 0,-10 C6,-24 18,-20 18,-10 C18,2 0,15 0,15 Z"
          fill={ENV.heart}
        />
      </g>
    </svg>
  );
}

/** Phong bì mở — logic hình khối (code bạn gửi), màu theo theme */
function OpenEnvelopeIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 400 340"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 8px 16px color-mix(in srgb, var(--om-primary) 26%, transparent))' }}
    >
      {/* Lớp 1: nền nhạt + nắp mở */}
      <rect x="0" y="120" width="400" height="200" fill={ENV.openBack} />
      <polygon points="0,120 200,10 400,120" fill={ENV.openBack} />
      <path
        d="M0,320 L0,120 L200,10 L400,120 L400,320"
        fill="none"
        stroke={ENV.openBackLine}
        strokeWidth="2"
      />

      {/* Lớp 2: tờ thư + tim */}
      <rect
        x="50"
        y="65"
        width="300"
        height="180"
        fill={ENV.paper}
        rx="4"
        ry="4"
        stroke={ENV.paperLine}
        strokeWidth="2"
      />
      <g transform="translate(200, 155) scale(1.3)">
        <path
          d="M0,15 C0,15 -18,2 -18,-10 C-18,-20 -6,-24 0,-10 C6,-24 18,-20 18,-10 C18,2 0,15 0,15 Z"
          fill={ENV.heart}
        />
      </g>

      {/* Lớp 3: mặt trước đậm — 3 tam giác */}
      <polygon
        points="0,120 140,230 0,320"
        fill={ENV.openFront}
        stroke={ENV.openFrontLine}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polygon
        points="400,120 260,230 400,320"
        fill={ENV.openFront}
        stroke={ENV.openFrontLine}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <polygon
        points="0,320 200,180 400,320"
        fill={ENV.openFront}
        stroke={ENV.openFrontLine}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LetterSheet({ letter, signatureFallback }) {
  const nickname = letter?.sender_name || signatureFallback || '…';
  const when = letter?.created_at
    ? new Date(letter.created_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';
  const time = letter?.created_at
    ? new Date(letter.created_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className="om-letter-paper relative bg-[#faf6ef] border border-[#e5ddd0] shadow-xl px-6 pt-7 pb-5 min-h-[240px] flex flex-col"
      style={{
        borderRadius: 2,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18), 2px 2px 0 #ebe4d8',
      }}
    >
      <p className="flex-1 text-[1.35rem] leading-snug text-gray-800 whitespace-pre-wrap text-left">
        {letter?.content}
      </p>
      <div className="mt-6 text-left">
        <p className="text-[1.25rem] text-[var(--om-primary)] leading-tight">{nickname}</p>
        <p className="text-[1.05rem] text-gray-500 mt-0.5">
          {when}
          {time ? ` · ${time}` : ''}
        </p>
      </div>
    </div>
  );
}

const Mailbox = () => {
  const { sessionUserId, partnerId, spaceId } = useSession();
  const queryClient = useQueryClient();
  const { data: letters = [], isLoading: lettersLoading } = useLoveLetters();
  const [newLetter, setNewLetter] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [openLetter, setOpenLetter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { tabNames } = useProfileNicknames();
  const lettersKey = useMemo(() => [...LOVE_LETTERS_QUERY_KEY, spaceId], [spaceId]);

  const invalidateLetters = () =>
    queryClient.invalidateQueries({ queryKey: lettersKey });

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const markLetterRead = useCallback(
    async (letter) => {
      if (!letter?.id) return;
      if (isLetterFromMe(letter, sessionUserId)) return;
      if (letter.is_read === true) return;

      const { error } = await supabase
        .from('love_letters')
        .update({ is_read: true })
        .eq('id', letter.id);
      if (error) {
        console.error('[Mailbox] Không cập nhật is_read:', error.message);
        return;
      }
      queryClient.setQueryData(lettersKey, (prev) =>
        (prev ?? []).map((l) => (l.id === letter.id ? { ...l, is_read: true } : l))
      );
      suppressLoveLettersRealtime();
    },
    [sessionUserId, queryClient, lettersKey]
  );

  const openLetterModal = (letter) => {
    setOpenLetter(letter);
    setModalVisible(true);
    void markLetterRead(letter);
  };

  const closeLetterModal = () => {
    setModalVisible(false);
    window.setTimeout(() => setOpenLetter(null), 220);
  };

  const sendLetter = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!newLetter.trim() || !sessionUserId || !partnerId || !spaceId) {
      setFeedback({ message: LOADING_COPY.MB_SEND_FAIL, error: true });
      return;
    }

    setSending(true);
    setFeedback(null);
    const startedAt = Date.now();
    const MIN_SEND_MS = 5000;
    try {
      const { error } = await supabase.from('love_letters').insert([
        {
          content: newLetter,
          sender_name: tabNames[sessionUserId],
          sender_id: sessionUserId,
          receiver_id: partnerId,
          space_id: spaceId,
          is_read: false,
        },
      ]);

      if (error) {
        setFeedback({ message: LOADING_COPY.MB_SEND_FAIL, error: true });
        return;
      }

      setNewLetter('');
      await invalidateLetters();
      void notifyPartner({
        targetMemberId: partnerId,
        title: 'Thư mới 💌',
        body: `${tabNames[sessionUserId] || 'Người ấy'} vừa gửi một lời thương cho bạn`,
        url: '/mailbox',
        tag: 'love-letter',
      });
      const wait = Math.max(0, MIN_SEND_MS - (Date.now() - startedAt));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      setFeedback({ message: LOADING_COPY.MB_SENT });
    } catch {
      setFeedback({ message: LOADING_COPY.MB_SEND_FAIL, error: true });
    } finally {
      setSending(false);
    }
  };

  const deleteLetter = async (id) => {
    if (deletingId) return;
    if (!window.confirm(LOADING_COPY.MB_DELETE_CONFIRM)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('love_letters').delete().eq('id', id);
      if (!error) {
        if (openLetter?.id === id) closeLetterModal();
        await invalidateLetters();
      } else {
        setFeedback({ message: LOADING_COPY.MB_SEND_FAIL, error: true });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredLetters = letters.filter((l) =>
    activeTab === 'inbox' ? !isLetterFromMe(l, sessionUserId) : isLetterFromMe(l, sessionUserId)
  );

  const modal =
    openLetter && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pb-28 sm:pb-4 ${
              modalVisible ? 'om-letter-modal-backdrop' : 'opacity-0 pointer-events-none'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Đọc thư"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label="Đóng"
              onClick={closeLetterModal}
            />
            <div
              className={`relative z-10 w-full max-w-sm transition-all duration-200 ${
                modalVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
              }`}
            >
              <button
                type="button"
                onClick={closeLetterModal}
                className="absolute -top-2 -right-1 z-30 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-red-400"
                aria-label="Đóng thư"
              >
                <X size={18} />
              </button>

              {deletingId === openLetter.id ? (
                <div className="om-letter-paper rounded-sm bg-[#faf6ef] min-h-[240px] flex items-center justify-center px-4">
                  <CuteLoader message={LOADING_COPY.MB_DELETING} />
                </div>
              ) : (
                <LetterSheet
                  letter={openLetter}
                  signatureFallback={tabNames[openLetter.sender_id]}
                />
              )}

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => deleteLetter(openLetter.id)}
                  disabled={deletingId === openLetter.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/95 text-red-400 border border-red-100 shadow-md hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Xóa thư
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 animate-fade-in font-sans">
      <header className="mb-8 text-center">
        <div className="inline-block p-3 bg-[color-mix(in_srgb,var(--om-accent)_20%,transparent)] rounded-full mb-3 shadow-inner">
          <MailOpen className="text-[var(--om-accent)]" size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Love Letters</h1>
      </header>

      <form
        onSubmit={sendLetter}
        className="bg-white p-6 rounded-[35px] shadow-2xl shadow-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] border border-[color-mix(in_srgb,var(--om-lavender)_30%,transparent)] mb-6 relative overflow-hidden group"
      >
        <div className="absolute -top-6 -right-6 opacity-[0.08] group-hover:scale-110 transition-transform duration-700">
          <Heart size={100} className="text-[var(--om-accent)] fill-[var(--om-accent)]" />
        </div>

        <textarea
          className="om-field w-full p-5 border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)] rounded-[25px] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] transition-all text-sm placeholder:italic min-h-[120px] relative z-10 disabled:opacity-60"
          placeholder={`Nhắn gì đó cho ${tabNames[partnerId] || 'người ấy'} nè...`}
          value={newLetter}
          onChange={(e) => setNewLetter(e.target.value)}
          disabled={sending}
        />

        {sending ? (
          <div className="mt-4 py-2">
            <CuteLoader message={LOADING_COPY.MB_SENDING} motion="letter" />
          </div>
        ) : (
          <button
            type="submit"
            className="mt-4 w-full bg-gradient-to-r from-[var(--om-primary)] to-[var(--om-lavender)] text-[var(--om-on-primary)] py-4 rounded-[20px] font-black flex items-center justify-center gap-3 hover:shadow-xl active:scale-95 transition-all shadow-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]"
          >
            <SendHorizontal size={20} /> Gửi lời thương
          </button>
        )}
      </form>

      {feedback && (
        <div className="mb-6">
          <CuteLoader variant="toast" message={feedback.message} error={Boolean(feedback.error)} />
        </div>
      )}

      <div className="flex gap-2 mb-6 bg-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] p-1 rounded-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]">
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
            activeTab === 'inbox' ? 'bg-white text-[var(--om-primary)] shadow-sm' : 'text-[var(--om-primary-soft)]'
          }`}
        >
          <Inbox size={14} /> Thư nhận được
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outbox')}
          className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
            activeTab === 'outbox' ? 'bg-white text-[var(--om-primary)] shadow-sm' : 'text-[var(--om-primary-soft)]'
          }`}
        >
          <Send size={14} /> Thư đã gửi
        </button>
      </div>

      <div className="min-h-[120px]">
        {lettersLoading && <CuteLoader message={LOADING_COPY.MB_LOAD} className="py-12" />}

        {!lettersLoading && filteredLetters.length > 0 && (
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-x-4 sm:gap-y-5 px-1">
            {filteredLetters.map((letter) => {
              // Chưa đọc = đóng; đã đọc = mở (outbox: đóng khi đối phương chưa đọc)
              const isOpen = letter.is_read === true;
              return (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => openLetterModal(letter)}
                  className="group relative aspect-[20/17] p-0.5 bg-transparent border-0 shadow-none active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-primary)] focus-visible:rounded-2xl"
                  aria-label={`${isOpen ? 'Thư đã đọc' : 'Thư mới'} từ ${letter.sender_name || 'người ấy'}`}
                >
                  {isOpen ? (
                    <OpenEnvelopeIcon className="w-full h-full group-hover:-translate-y-1 group-hover:scale-[1.03] transition-transform duration-200" />
                  ) : (
                    <ClosedEnvelopeIcon className="w-full h-full group-hover:-translate-y-1 group-hover:scale-[1.03] transition-transform duration-200" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!lettersLoading && filteredLetters.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 om-surface rounded-full flex items-center justify-center opacity-40">
              <MailOpen size={30} className="text-[var(--om-primary-soft)]" />
            </div>
            <p className="text-gray-400 text-xs italic font-medium">Hộp thư đang trống trải quá...</p>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-[var(--om-accent)] mt-10 font-black uppercase tracking-widest animate-pulse">
        {tabNames[sessionUserId] || 'Bạn'} thương {tabNames[partnerId] || 'người ấy'}
        {', '}
        {tabNames[partnerId] || 'Người ấy'} thương {tabNames[sessionUserId] || 'bạn'}
      </p>

      {modal}
    </div>
  );
};

export default Mailbox;
