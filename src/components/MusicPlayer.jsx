import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { Music, X, Disc, Trash2, ChevronDown, Plus } from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';
import { isIosDevice, isMobileDevice } from '../lib/device';

function loadYoutubeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prior?.();
      } catch {
        /* ignore */
      }
      resolve(window.YT);
    };
    if (!document.getElementById('om-youtube-api')) {
      const tag = document.createElement('script');
      tag.id = 'om-youtube-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

const MusicPlayer = () => {
  const { sessionUserId, spaceId } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [link, setLink] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [frameBox, setFrameBox] = useState(null);
  // Mobile (iOS + Android): không autoplay khi mở app — chờ chạm nút nhạc
  const [audioUnlocked, setAudioUnlocked] = useState(() => !isMobileDevice());
  const firstPlaylistLoad = useRef(true);
  const slotRef = useRef(null);
  const panelRef = useRef(null);
  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const wantedVideoRef = useRef('');

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

  useLayoutEffect(() => {
    if (!isExpanded) {
      setFrameBox(null);
      return undefined;
    }

    const measure = () => {
      const el = slotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      setFrameBox({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    measure();
    const raf1 = requestAnimationFrame(measure);
    const t1 = window.setTimeout(measure, 80);
    const t2 = window.setTimeout(measure, 560);

    const onTransitionEnd = (e) => {
      if (panelRef.current && (e.target === panelRef.current || panelRef.current.contains(e.target))) {
        measure();
      }
    };

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('transitionend', onTransitionEnd);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && slotRef.current) ro.observe(slotRef.current);

    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('transitionend', onTransitionEnd);
      ro?.disconnect();
    };
  }, [isExpanded]);

  // YouTube IFrame API — play khi đã unlock; host luôn nằm trong viewport
  useEffect(() => {
    wantedVideoRef.current = videoId || '';
    if (!audioUnlocked || !videoId || !ytMountRef.current) return undefined;

    let cancelled = false;

    const ensurePlayer = async () => {
      const YT = await loadYoutubeApi();
      if (cancelled || !YT?.Player || !ytMountRef.current) return;

      const id = wantedVideoRef.current;
      if (!id) return;

      const existing = ytPlayerRef.current;
      if (existing?.loadVideoById) {
        try {
          existing.loadVideoById({ videoId: id });
          existing.playVideo?.();
          return;
        } catch {
          try {
            existing.destroy?.();
          } catch {
            /* ignore */
          }
          ytPlayerRef.current = null;
        }
      }

      ytMountRef.current.innerHTML = '';
      ytPlayerRef.current = new YT.Player(ytMountRef.current, {
        width: '100%',
        height: '100%',
        videoId: id,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          loop: 1,
          playlist: id,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            try {
              event.target.playVideo();
            } catch {
              /* iOS có thể cần thêm 1 tap trên player */
            }
          },
        },
      });
    };

    void ensurePlayer();

    return () => {
      cancelled = true;
    };
  }, [audioUnlocked, videoId]);

  useEffect(() => {
    return () => {
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, []);

  const unlockAndPlay = useCallback(() => {
    const wasLocked = !audioUnlocked;
    flushSync(() => {
      setAudioUnlocked(true);
      // iOS: mở panel để player visible (WebKit chặn media ẩn)
      if (wasLocked && isIosDevice()) setIsExpanded(true);
    });
    window.setTimeout(() => {
      try {
        ytPlayerRef.current?.playVideo?.();
      } catch {
        /* ignore */
      }
    }, 400);
  }, [audioUnlocked]);

  const closePanel = () => {
    setShowDropdown(false);
    setIsExpanded(false);
  };

  const togglePanel = () => {
    if (!audioUnlocked) {
      unlockAndPlay();
      return;
    }
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

  // Expanded: khớp ô video. Collapsed: vẫn trong viewport (1 ô nhỏ) — iOS mới cho phát
  const playerHostStyle =
    isExpanded && frameBox
      ? {
          position: 'fixed',
          top: frameBox.top,
          left: frameBox.left,
          width: frameBox.width,
          height: frameBox.height,
          zIndex: 120,
          pointerEvents: 'auto',
          opacity: 1,
          borderRadius: '1rem',
          overflow: 'hidden',
        }
      : {
          position: 'fixed',
          right: 20,
          bottom: 96,
          width: audioUnlocked ? 44 : 1,
          height: audioUnlocked ? 44 : 1,
          zIndex: 95,
          pointerEvents: 'none',
          opacity: audioUnlocked ? 0.04 : 0.01,
          overflow: 'hidden',
          borderRadius: 12,
        };

  const player = (
    <div className="bg-black" style={playerHostStyle} aria-hidden={!isExpanded}>
      <div ref={ytMountRef} className="h-full w-full" />
    </div>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(player, document.body) : null}

      <div className="fixed inset-x-0 bottom-0 md:inset-x-auto md:bottom-8 md:right-8 z-[100] flex flex-col items-stretch md:items-end font-sans pointer-events-none px-3 pb-[5.5rem] md:px-0 md:pb-0">
        {!audioUnlocked && (
          <button
            type="button"
            onClick={unlockAndPlay}
            className="pointer-events-auto self-end mb-2 rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-wider shadow-xl border backdrop-blur-md"
            style={{
              background: 'color-mix(in srgb, var(--om-primary) 92%, white)',
              color: 'var(--om-on-primary)',
              borderColor: 'color-mix(in srgb, var(--om-primary-soft) 40%, transparent)',
              boxShadow: '0 8px 24px var(--om-shadow)',
            }}
          >
            Chạm để phát nhạc
          </button>
        )}

        <div
          ref={panelRef}
          aria-hidden={!isExpanded}
          inert={!isExpanded ? true : undefined}
          className={`bg-white/95 backdrop-blur-xl shadow-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] transition-all duration-500 origin-bottom md:origin-bottom-right pointer-events-auto w-full md:w-80 max-h-[min(70vh,34rem)] overflow-y-auto overflow-x-hidden custom-scrollbar ${
            isExpanded
              ? 'opacity-100 scale-100 translate-y-0 visible mb-3 rounded-[28px] p-4 md:p-5'
              : 'opacity-0 scale-95 translate-y-6 invisible pointer-events-none absolute bottom-16 right-3 md:right-0 w-[min(100%,20rem)] h-0 p-0 overflow-hidden border-0'
          }`}
        >
          <div className="flex justify-between items-center mb-3 md:mb-4 sticky top-0 bg-white/90 backdrop-blur-sm z-20 -mx-1 px-1 pb-1">
            <h4
              className="text-xs font-black uppercase tracking-widest flex items-center gap-2"
              style={{ color: 'var(--om-primary)' }}
            >
              <Music size={14} /> Music Box
            </h4>
            <button type="button" onClick={closePanel} className="text-gray-400 hover:text-red-400 transition-all p-1">
              <X size={18} />
            </button>
          </div>

          <div
            ref={slotRef}
            className="rounded-2xl overflow-hidden mb-3 md:mb-4 shadow-inner bg-black aspect-video relative z-0 border border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)]"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50 px-4 text-center">
              {audioUnlocked ? 'Đang phát…' : 'Chạm nút phát nhạc'}
              {audioUnlocked && isIosDevice() && (
                <span className="normal-case tracking-normal font-semibold text-white/70 text-[11px]">
                  Nếu chưa nghe, chạm nút ▶ trên video một lần
                </span>
              )}
            </div>
          </div>

          <div className="relative mb-3 md:mb-4 z-10">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="om-field w-full border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] p-3 rounded-2xl flex justify-between items-center text-xs font-bold hover:opacity-90 transition-all"
            >
              <span className="truncate mr-2 text-left text-[var(--om-on-field)]">{currentSongTitle}</span>
              <ChevronDown size={16} className={`shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && isExpanded && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] rounded-2xl shadow-xl max-h-40 overflow-y-auto z-30 py-1 custom-scrollbar">
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
                        window.setTimeout(() => {
                          try {
                            ytPlayerRef.current?.playVideo?.();
                          } catch {
                            /* ignore */
                          }
                        }, 300);
                      }}
                      className="flex-1 truncate text-left min-w-0"
                    >
                      <span className="text-[11px] font-medium text-gray-700 truncate block">{song.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteSong(song.id, e)}
                      className="text-gray-400 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-all ml-2 p-2 shrink-0"
                      aria-label="Xóa bài"
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

          <div className="space-y-2 pt-3 border-t border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)] relative z-10">
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Tên bài hát..."
              tabIndex={isExpanded ? 0 : -1}
              className="om-field w-full border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] rounded-xl px-3 py-2.5 text-xs text-[var(--om-on-field)] outline-none focus:border-[var(--om-primary)] transition-all"
            />
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Link YouTube..."
                tabIndex={isExpanded ? 0 : -1}
                className="om-field flex-1 min-w-0 border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] rounded-xl px-3 py-2.5 text-xs text-[var(--om-on-field)] outline-none focus:border-[var(--om-primary)] transition-all"
              />
              <button
                type="button"
                onClick={handleAddMusic}
                className="w-11 h-11 rounded-xl shrink-0 shadow-md active:scale-95 transition-all flex items-center justify-center"
                style={{
                  background: 'var(--om-primary)',
                  color: 'var(--om-on-primary)',
                  boxShadow: '0 4px 14px var(--om-shadow)',
                }}
                aria-label="Thêm bài hát"
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
          className="pointer-events-auto self-end bg-white/95 backdrop-blur-md p-1.5 pr-4 rounded-full shadow-2xl flex items-center gap-3 border cursor-pointer hover:scale-105 transition-all"
          style={{ borderColor: 'color-mix(in srgb, var(--om-primary-soft) 45%, transparent)' }}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-500 shadow-inner ${isExpanded ? 'rotate-[360deg]' : 'animate-spin-slow'}`}
            style={{ background: 'var(--om-primary)' }}
          >
            <Disc size={20} style={{ color: 'var(--om-on-primary)' }} />
          </div>
          <div
            className={`flex flex-col overflow-hidden transition-all duration-300 text-left ${isExpanded ? 'w-0 opacity-0 pr-0' : 'w-32 opacity-100'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--om-primary)' }}>
              {audioUnlocked ? 'Đang phát' : 'Chạm phát'}
            </span>
            <span className="text-xs font-bold text-gray-700 truncate">{currentSongTitle}</span>
          </div>
        </button>
      </div>
    </>
  );
};

export default MusicPlayer;
