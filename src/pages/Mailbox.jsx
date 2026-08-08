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

/** Phong bì đóng — màu theo theme */
function ClosedEnvelopeIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden>
      <rect
        x="4"
        y="10"
        width="112"
        height="72"
        rx="6"
        fill="var(--om-primary)"
      />
      <path
        d="M4 16 L60 52 L116 16"
        fill="none"
        stroke="color-mix(in srgb, var(--om-on-primary) 28%, transparent)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M4 78 L48 42"
        fill="none"
        stroke="color-mix(in srgb, var(--om-on-primary) 22%, transparent)"
        strokeWidth="2"
      />
      <path
        d="M116 78 L72 42"
        fill="none"
        stroke="color-mix(in srgb, var(--om-on-primary) 22%, transparent)"
        strokeWidth="2"
      />
      <path
        d="M60 38c-3.2-6.4-12-6.4-12 1.2 0 7.2 12 14.8 12 14.8s12-7.6 12-14.8c0-7.6-8.8-7.6-12-1.2z"
        fill="var(--om-accent)"
      />
    </svg>
  );
}

/** Phong bì mở (nắp + thân) — dùng trong popup */
function OpenEnvelopeStage({ children }) {
  return (
    <div className="relative w-full max-w-[300px] mx-auto" style={{ perspective: 900 }}>
      {/* Tờ thư nhô lên */}
      <div className="om-letter-sheet relative z-10 mx-auto w-[86%]">{children}</div>

      {/* Thân phong bì */}
      <div className="relative z-20 -mt-8">
        <svg viewBox="0 0 300 140" className="w-full h-auto drop-shadow-md" aria-hidden>
          <path
            d="M12 28 H288 Q298 28 298 38 V122 Q298 132 288 132 H12 Q2 132 2 122 V38 Q2 28 12 28 Z"
            fill="var(--om-primary)"
          />
          <path
            d="M2 38 L150 100 L298 38"
            fill="none"
            stroke="color-mix(in srgb, var(--om-on-primary) 25%, transparent)"
            strokeWidth="3"
          />
          <path
            d="M2 132 L110 72"
            fill="none"
            stroke="color-mix(in srgb, var(--om-on-primary) 18%, transparent)"
            strokeWidth="2.5"
          />
          <path
            d="M298 132 L190 72"
            fill="none"
            stroke="color-mix(in srgb, var(--om-on-primary) 18%, transparent)"
            strokeWidth="2.5"
          />
        </svg>

        {/* Nắp mở lên */}
        <div
          className="om-envelope-flap-open absolute left-0 right-0 top-0 -translate-y-[1px]"
          style={{ height: '42%' }}
        >
          <svg viewBox="0 0 300 90" className="w-full h-full" aria-hidden>
            <path
              d="M2 8 L150 82 L298 8 Q298 2 288 2 H12 Q2 2 2 8 Z"
              fill="color-mix(in srgb, var(--om-primary) 72%, #5a3d4a)"
            />
            <path
              d="M2 8 L150 82 L298 8"
              fill="none"
              stroke="color-mix(in srgb, var(--om-on-primary) 20%, transparent)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function LetterSheet({ letter, signatureFallback }) {
  const when = letter?.created_at
    ? new Date(letter.created_at).toLocaleString('vi-VN')
    : '';

  return (
    <div
      className="relative rounded-sm bg-[#faf6ef] border border-[color-mix(in_srgb,var(--om-primary-soft)_35%,#e8e0d4)] shadow-lg px-5 pt-6 pb-5 min-h-[200px] flex flex-col"
      style={{
        boxShadow:
          '0 10px 28px color-mix(in srgb, var(--om-shadow) 55%, transparent), 3px 3px 0 color-mix(in srgb, var(--om-primary-soft) 25%, transparent)',
      }}
    >
      {/* góc giấy cong nhẹ */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-10 h-10"
        style={{
          background:
            'linear-gradient(135deg, transparent 50%, color-mix(in srgb, var(--om-primary-soft) 35%, #ebe4d8) 50%)',
          borderBottomRightRadius: 2,
        }}
      />
      <p
        className="flex-1 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap text-center italic"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {letter?.content}
      </p>
      <div className="mt-5 pt-3 border-t border-dashed border-[color-mix(in_srgb,var(--om-primary-soft)_45%,transparent)] text-center">
        <p
          className="text-sm font-semibold text-[var(--om-primary)]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          — {letter?.sender_name || signatureFallback || '…'}
        </p>
        <p className="text-[10px] text-gray-400 font-bold mt-1 tracking-wide">{when}</p>
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

              <OpenEnvelopeStage>
                {deletingId === openLetter.id ? (
                  <div className="rounded-sm bg-[#faf6ef] min-h-[200px] flex items-center justify-center px-4">
                    <CuteLoader message={LOADING_COPY.MB_DELETING} />
                  </div>
                ) : (
                  <LetterSheet
                    letter={openLetter}
                    signatureFallback={tabNames[openLetter.sender_id]}
                  />
                )}
              </OpenEnvelopeStage>

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
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {filteredLetters.map((letter) => {
              const unread =
                activeTab === 'inbox' &&
                !isLetterFromMe(letter, sessionUserId) &&
                letter.is_read !== true;
              return (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => openLetterModal(letter)}
                  className={`group relative aspect-[4/3] rounded-2xl p-2 sm:p-3 bg-white/70 border border-[color-mix(in_srgb,var(--om-primary-soft)_28%,transparent)] shadow-sm hover:shadow-md active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-primary)] ${
                    unread ? 'om-envelope-unread' : ''
                  }`}
                  aria-label={`Mở thư từ ${letter.sender_name || 'người ấy'}`}
                >
                  <ClosedEnvelopeIcon className="w-full h-full drop-shadow-sm group-hover:-translate-y-0.5 transition-transform" />
                  {unread && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--om-accent)] shadow" />
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
