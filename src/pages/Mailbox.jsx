import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Send, Heart, MailOpen, Inbox, SendHorizontal, Trash2, Sparkles } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { isLetterFromMe } from '../lib/loveLetterIdentity';
import { useProfileNicknames } from '../hooks/useProfiles';
import {
  useLoveLetters,
  LOVE_LETTERS_QUERY_KEY,
  suppressLoveLettersRealtime,
} from '../hooks/useLoveLetters';

const Mailbox = () => {
  const { sessionUserId, partnerId, spaceId } = useSession();
  const queryClient = useQueryClient();
  const { data: letters = [] } = useLoveLetters();
  const [newLetter, setNewLetter] = useState('');
  const [activeTab, setActiveTab] = useState('inbox'); // inbox | outbox
  const inboxMarkedRef = useRef(false);

  const { tabNames } = useProfileNicknames();
  const lettersKey = useMemo(() => [...LOVE_LETTERS_QUERY_KEY, spaceId], [spaceId]);

  const invalidateLetters = () =>
    queryClient.invalidateQueries({ queryKey: lettersKey });

  useEffect(() => {
    if (activeTab !== 'inbox') {
      inboxMarkedRef.current = false;
      return;
    }
    if (inboxMarkedRef.current) return;

    const unreadIds = letters
      .filter((l) => !isLetterFromMe(l, sessionUserId) && l.is_read !== true)
      .map((l) => l.id);
    if (!unreadIds.length) return;

    inboxMarkedRef.current = true;

    (async () => {
      const { error } = await supabase
        .from('love_letters')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (error) {
        console.error('[Mailbox] Không cập nhật is_read (kiểm tra RLS):', error.message);
        inboxMarkedRef.current = false;
        return;
      }
      queryClient.setQueryData(lettersKey, (prev) =>
        (prev ?? []).map((l) =>
          unreadIds.includes(l.id) ? { ...l, is_read: true } : l
        )
      );
      suppressLoveLettersRealtime();
    })();
  }, [activeTab, letters, sessionUserId, queryClient, lettersKey]);

  const sendLetter = async (e) => {
    e.preventDefault();
    if (!newLetter.trim() || !sessionUserId || !partnerId || !spaceId) {
      alert('Cần đủ hai thành viên trong Space mới gửi thư được nhé.');
      return;
    }

    const { error } = await supabase
      .from('love_letters')
      .insert([{
        content: newLetter,
        sender_name: tabNames[sessionUserId],
        sender_id: sessionUserId,
        receiver_id: partnerId,
        space_id: spaceId,
        is_read: false,
      }]);

    if (!error) {
      setNewLetter('');
      await invalidateLetters();
      alert("Đã gửi yêu thương thành công! ✨");
    } else {
      alert(error.message);
    }
  };

  const deleteLetter = async (id) => {
    if (!window.confirm("Xóa bức thư này đi sao? 🥺")) return;
    const { error } = await supabase.from('love_letters').delete().eq('id', id);
    if (!error) await invalidateLetters();
  };

  const filteredLetters = letters.filter((l) =>
    activeTab === 'inbox' ? !isLetterFromMe(l, sessionUserId) : isLetterFromMe(l, sessionUserId)
  );

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 animate-fade-in font-sans">
      
      {/* HEADER */}
      <header className="mb-8 text-center">
        <div className="inline-block p-3 bg-[color-mix(in_srgb,var(--om-accent)_20%,transparent)] rounded-full mb-3 shadow-inner">
          <MailOpen className="text-[var(--om-accent)]" size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Love Letters</h1>
      </header>

      {/* FORM VIẾT THƯ */}
      <form onSubmit={sendLetter} className="bg-white p-6 rounded-[35px] shadow-2xl shadow-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] border border-[color-mix(in_srgb,var(--om-lavender)_30%,transparent)] mb-10 relative overflow-hidden group">
        <div className="absolute -top-6 -right-6 opacity-[0.08] group-hover:scale-110 transition-transform duration-700">
          <Heart size={100} className="text-[var(--om-accent)] fill-[var(--om-accent)]" />
        </div>
        
        <textarea
          className="om-field w-full p-5 border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)] rounded-[25px] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] transition-all text-sm placeholder:italic min-h-[120px] relative z-10"
          placeholder={`Nhắn gì đó cho ${tabNames[partnerId] || 'người ấy'} nè...`}
          value={newLetter}
          onChange={(e) => setNewLetter(e.target.value)}
        />
        
        <button
          type="submit"
          className="mt-4 w-full bg-gradient-to-r from-[var(--om-primary)] to-[var(--om-lavender)] text-[var(--om-on-primary)] py-4 rounded-[20px] font-black flex items-center justify-center gap-3 hover:shadow-xl active:scale-95 transition-all shadow-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)]"
        >
          <SendHorizontal size={20} /> Gửi lời thương
        </button>
      </form>

      {/* TABS: HỘP THƯ ĐẾN / HỘP THƯ ĐI */}
      <div className="flex gap-2 mb-6 bg-[color-mix(in_srgb,var(--om-primary-soft)_10%,transparent)] p-1 rounded-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]">
        <button 
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
            activeTab === 'inbox' ? 'bg-white text-[var(--om-primary)] shadow-sm' : 'text-[var(--om-primary-soft)]'
          }`}
        >
          <Inbox size={14} /> Thư nhận được
        </button>
        <button 
          onClick={() => setActiveTab('outbox')}
          className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
            activeTab === 'outbox' ? 'bg-white text-[var(--om-primary)] shadow-sm' : 'text-[var(--om-primary-soft)]'
          }`}
        >
          <Send size={14} /> Thư đã gửi
        </button>
      </div>

      {/* DANH SÁCH THƯ */}
      <div className="grid gap-5">
        {filteredLetters.map((letter) => (
          <div key={letter.id} className="bg-white p-6 rounded-[30px] shadow-sm border border-[color-mix(in_srgb,var(--om-lavender)_30%,transparent)] relative group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[color-mix(in_srgb,var(--om-accent)_10%,transparent)] rounded-full flex items-center justify-center">
                  <Heart size={14} className="fill-[var(--om-accent)] text-[var(--om-accent)]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-[var(--om-primary)] uppercase tracking-tighter">
                    {letter.sender_name}
                  </p>
                  <p className="text-[9px] text-gray-400 font-bold">
                    {new Date(letter.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => deleteLetter(letter.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap italic">
              "{letter.content}"
            </p>
            
            <div className="absolute bottom-0 right-0 p-2 opacity-[0.05]">
               <Sparkles size={40} className="text-[var(--om-primary-soft)]" />
            </div>
          </div>
        ))}

        {filteredLetters.length === 0 && (
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
      </p>

    </div>
  );
};

export default Mailbox;