import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { Music, X, Disc, Trash2, ChevronDown, Plus } from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';

const MusicPlayer = () => {
  const { sessionUserId, spaceId } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [link, setLink] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const firstPlaylistLoad = useRef(true);

  const fetchPlaylist = useCallback(async () => {
    if (!spaceId) {
      setPlaylist([]);
      return;
    }
    const { data } = await supabase
      .from('shared_playlist')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    if (data) {
      setPlaylist(data);
      if (firstPlaylistLoad.current) {
        firstPlaylistLoad.current = false;
        if (data.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.length);
          setVideoId(data[randomIndex].youtube_id);
        } else {
          setVideoId('jfKfPfyJRdk');
        }
      }
    }
  }, [spaceId]);

  useEffect(() => {
    firstPlaylistLoad.current = true;
    void fetchPlaylist();
  }, [fetchPlaylist]);

  const currentSongTitle =
    playlist.find((s) => s.youtube_id === videoId)?.title ||
    (videoId === 'jfKfPfyJRdk' ? 'Lofi Chill Nhẹ Nhàng' : LOADING_COPY.AP_SONG_PLAYER);

  useEffect(() => {
    if (videoId) {
      localStorage.setItem('currentSongTitle', currentSongTitle);
      window.dispatchEvent(new CustomEvent('musicChanged', { detail: currentSongTitle }));
    }
  }, [currentSongTitle, videoId]);

  useEffect(() => {
    if (!isExpanded) setShowDropdown(false);
  }, [isExpanded]);

  const closePanel = () => {
    setShowDropdown(false);
    setIsExpanded(false);
  };

  const togglePanel = () => {
    setIsExpanded((open) => {
      if (open) setShowDropdown(false);
      return !open;
    });
  };

  const handleAddMusic = async () => {
    if (!spaceId) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    if (match && match[2].length === 11 && songTitle.trim()) {
      const { error } = await supabase.from('shared_playlist').insert([
        {
          youtube_id: match[2],
          title: songTitle.trim(),
          added_by: sessionUserId,
          space_id: spaceId,
        },
      ]);
      if (!error) {
        setVideoId(match[2]);
        setLink('');
        setSongTitle('');
        fetchPlaylist();
        setIsExpanded(false);
      } else {
        alert(error.message);
      }
    }
  };

  const deleteSong = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Xóa bài nhạc này nha?')) return;
    await supabase.from('shared_playlist').delete().eq('id', id);
    fetchPlaylist();
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-[100] flex flex-col items-end font-sans pointer-events-none">
      <div
        aria-hidden={!isExpanded}
        inert={!isExpanded ? true : undefined}
        className={`bg-white/95 backdrop-blur-xl p-5 rounded-[35px] shadow-2xl w-80 border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] transition-all duration-500 origin-bottom-right mb-4 ${
          isExpanded
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto visible'
            : 'opacity-0 scale-50 translate-y-10 pointer-events-none invisible absolute bottom-16 right-0'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--om-primary)' }}>
            <Music size={14} /> Music Box
          </h4>
          <button type="button" onClick={closePanel} className="text-gray-400 hover:text-red-400 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden mb-4 shadow-lg bg-black aspect-video relative z-0 border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]">
          {videoId && (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="music"
              // iframe YouTube bỏ qua pointer-events của parent — phải set trực tiếp
              className={isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}
              tabIndex={isExpanded ? 0 : -1}
            />
          )}
        </div>

        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="om-field w-full border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] p-3 rounded-2xl flex justify-between items-center text-xs font-bold hover:opacity-90 transition-all"
          >
            <span className="truncate mr-2">{currentSongTitle}</span>
            <ChevronDown size={16} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && isExpanded && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] rounded-2xl shadow-xl max-h-40 overflow-y-auto z-[999] py-1 custom-scrollbar">
              {playlist.map((song) => (
                <div
                  key={song.id}
                  className="flex justify-between items-center p-3 bg-white hover:bg-[color-mix(in_srgb,var(--om-primary)_5%,transparent)] cursor-pointer group transition-colors border-b border-gray-50 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setVideoId(song.youtube_id);
                      setShowDropdown(false);
                    }}
                    className="flex-1 truncate text-left"
                  >
                    <span className="text-[11px] font-medium text-gray-700 truncate">{song.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => deleteSong(song.id, e)}
                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {playlist.length === 0 && (
                <div className="text-center p-3 text-xs text-gray-400 italic bg-white">Chưa có bài nào...</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]">
          <input
            type="text"
            value={songTitle}
            onChange={(e) => setSongTitle(e.target.value)}
            placeholder="Tên bài hát..."
            tabIndex={isExpanded ? 0 : -1}
            className="om-field w-full border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--om-primary)] transition-all"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link YouTube..."
              tabIndex={isExpanded ? 0 : -1}
              className="om-field flex-1 border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--om-primary)] transition-all"
            />
            <button
              type="button"
              onClick={handleAddMusic}
              className="p-2 rounded-xl shrink-0 shadow-md active:scale-95 transition-all"
              style={{ background: 'var(--om-primary)', color: 'var(--om-on-primary)', boxShadow: '0 4px 14px var(--om-shadow)' }}
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Đóng Music Box' : 'Mở Music Box'}
        className="pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 pr-4 rounded-full shadow-2xl flex items-center gap-3 border cursor-pointer hover:scale-105 transition-all"
        style={{ borderColor: 'color-mix(in srgb, var(--om-primary-soft) 45%, transparent)' }}
      >
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-500 shadow-inner ${isExpanded ? 'rotate-[360deg]' : 'animate-spin-slow'}`}
          style={{ background: 'var(--om-primary)' }}
        >
          <Disc size={20} style={{ color: 'var(--om-on-primary)' }} />
        </div>
        <div
          className={`flex flex-col overflow-hidden transition-all duration-300 text-left ${isExpanded ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}
        >
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--om-primary)' }}>
            Đang phát
          </span>
          <span className="text-xs font-bold text-gray-700 truncate">{currentSongTitle}</span>
        </div>
      </button>
    </div>
  );
};

export default MusicPlayer;
