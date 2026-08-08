import { useState, useEffect, useMemo, useCallback } from 'react';
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

/** Màu phong bì theo theme, soft như ảnh mẫu */
const ENV = {
  body: 'color-mix(in srgb, var(--om-primary) 42%, white)',
  bodyDeep: 'color-mix(in srgb, var(--om-primary) 62%, white)',
  inner: 'color-mix(in srgb, var(--om-primary) 55%, #e07a5f)',
  line: 'color-mix(in srgb, var(--om-primary) 55%, #b07070)',
  paper: '#fff8f0',
  heart: 'color-mix(in srgb, var(--om-accent) 35%, #e85a6b)',
};

function HeartSeal({ cx, cy, s = 1 }) {
  return (
    <path
      transform={`translate(${cx} ${cy}) scale(${s})`}
      d="M0-2.2c-1.4-2.8-5.2-2.8-5.2.7 0 3.5 5.2 6.8 5.2 6.8s5.2-3.3 5.2-6.8c0-3.5-3.8-3.5-5.2-.7z"
      fill={ENV.heart}
    />
  );
}

/** Phong bì đóng — thư chưa đọc */
function ClosedEnvelopeIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 4px 8px color-mix(in srgb, var(--om-primary) 22%, transparent))' }}
    >
      <rect x="14" y="28" width="132" height="78" rx="12" fill={ENV.body} />
      <path
        d="M14 40 C14 34 20 28 26 28 H134 C140 28 146 34 146 40 L80 78 Z"
        fill={ENV.bodyDeep}
      />
      <path
        d="M14 40 L80 78 L146 40"
        fill="none"
        stroke={ENV.line}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <path
        d="M14 100 L52 62 M146 100 L108 62"
        fill="none"
        stroke={ENV.line}
        strokeWidth="1.8"
        opacity="0.28"
      />
      <HeartSeal cx={80} cy={58} s={1.25} />
    </svg>
  );
}

/** Phong bì mở — thư đã đọc (bám ảnh mẫu) */
function OpenEnvelopeIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 160 140"
      className={className}
      aria-hidden
      style={{ filter: 'drop-shadow(0 4px 8px color-mix(in srgb, var(--om-primary) 22%, transparent))' }}
    >
      {/* Nắp mở lên — mặt trong đậm hơn */}
      <path
        d="M20 70 L80 22 L140 70 Z"
        fill={ENV.inner}
        stroke={ENV.line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Tờ giấy kem + tim */}
      <rect x="52" y="38" width="56" height="52" rx="7" fill={ENV.paper} />
      <HeartSeal cx={80} cy={56} s={1.5} />
      {/* Thân + túi trước (che mép giấy) */}
      <path
        d="M16 70
           H144
           C150 70 154 74 154 80
           V112
           C154 122 146 128 136 128
           H24
           C14 128 6 122 6 112
           V80
           C6 74 10 70 16 70 Z"
        fill={ENV.body}
      />
      {/* Nếp gấp túi chữ V */}
      <path
        d="M6 80 L80 118 L154 80"
        fill="none"
        stroke={ENV.line}
        strokeWidth="2.2"
        strokeLinejoin="round"
        opacity="0.42"
      />
      <path
        d="M24 128 L80 98 L136 128"
        fill="none"
        stroke={ENV.line}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.22"
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
                  className="group relative aspect-square p-1 bg-transparent border-0 shadow-none active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-primary)] focus-visible:rounded-2xl"
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
