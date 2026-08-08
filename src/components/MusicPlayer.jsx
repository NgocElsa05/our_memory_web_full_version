import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';
import { Music, X, Disc, Trash2, ChevronDown, Plus } from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';
import { isIosDevice, isMobileDevice } from '../lib/device';

const FALLBACK_VIDEO_ID = 'jfKfPfyJRdk';

function normalizeYoutubeId(raw) {
  const id = String(raw || '').trim();
  return /^[\w-]{11}$/.test(id) ? id : '';
}

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
    // API đã có sẵn nhưng callback đã fire trước đó
    if (window.YT?.Player) resolve(window.YT);
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
  /** Chrome play rồi pause vì mất user-gesture → hiện nút chạm ▶ trên video */
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const firstPlaylistLoad = useRef(true);
  const slotRef = useRef(null);
  const panelRef = useRef(null);
  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const wantedVideoRef = useRef('');
  const playlistRef = useRef([]);
  const unlockAtRef = useRef(0);

  // Preload YT API sớm — lúc chạm không phải chờ tải script (mất gesture)
  useEffect(() => {
    void loadYoutubeApi();
  }, []);

  const fetchPlaylist = useCallback(async () => {
    if (!spaceId) {
      setPlaylist([]);
      playlistRef.current = [];
      return;
    }
    const { data } = await supabase
      .from('shared_playlist')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });
    if (data) {
      playlistRef.current = data;
      setPlaylist(data);
      if (firstPlaylistLoad.current) {
        firstPlaylistLoad.current = false;
        const valid = data.map((s) => normalizeYoutubeId(s.youtube_id)).filter(Boolean);
        if (valid.length > 0) {
          const randomIndex = Math.floor(Math.random() * valid.length);
          setVideoId(valid[randomIndex]);
        } else {
          setVideoId(FALLBACK_VIDEO_ID);
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
    (videoId === FALLBACK_VIDEO_ID ? 'Lofi Chill Nhẹ Nhàng' : LOADING_COPY.AP_SONG_PLAYER);

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

  // Tạo / đổi video — KHÔNG gọi playVideo từ timer ngoài gesture (Chrome sẽ play rồi pause liền)
  useEffect(() => {
    wantedVideoRef.current = videoId || '';
    if (!audioUnlocked || !videoId || !ytMountRef.current) return undefined;
    if (isMobileDevice() && (!isExpanded || !frameBox)) return undefined;

    let cancelled = false;

    const ensurePlayer = async () => {
      const YT = await loadYoutubeApi();
      if (cancelled || !YT?.Player || !ytMountRef.current) return;

      const id = normalizeYoutubeId(wantedVideoRef.current);
      if (!id) return;

      const existing = ytPlayerRef.current;
      if (existing?.loadVideoById || existing?.cueVideoById) {
        try {
          if (isMobileDevice()) {
            // Cue thôi — playVideo từ effect/timer bị Chrome pause ngay
            existing.cueVideoById?.({ videoId: id });
            setNeedsTapToPlay(true);
          } else {
            existing.loadVideoById({ videoId: id });
            existing.unMute?.();
            existing.playVideo?.();
          }
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
          autoplay: isMobileDevice() ? 0 : 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          controls: 1,
          fs: 0,
          // Loop 1 video: YouTube yêu cầu playlist = chính videoId đó
          loop: 1,
          playlist: id,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            if (!isMobileDevice()) {
              try {
                event.target.unMute?.();
                event.target.playVideo();
                setNeedsTapToPlay(false);
              } catch {
                setNeedsTapToPlay(true);
              }
              return;
            }
            // Mobile: thử phát ngay sau unlock (sticky gesture); nếu Chrome pause → hiện nút chạm
            const justUnlocked = Date.now() - unlockAtRef.current < 4000;
            if (justUnlocked) {
              try {
                event.target.unMute?.();
                event.target.playVideo();
              } catch {
                /* ignore */
              }
            }
            window.setTimeout(() => {
              if (cancelled) return;
              try {
                const st = event.target.getPlayerState?.();
                // 1 = playing
                if (st !== 1) setNeedsTapToPlay(true);
                else setNeedsTapToPlay(false);
              } catch {
                setNeedsTapToPlay(true);
              }
            }, 800);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            // 1 playing
            if (event?.data === 1) setNeedsTapToPlay(false);
            // 0 ended — phát lại từ đầu (fallback nếu loop playerVars không ăn)
            if (event?.data === 0) {
              try {
                event.target.seekTo?.(0, true);
                event.target.playVideo?.();
              } catch {
                /* ignore */
              }
              return;
            }
            // 2 paused — nếu vừa unlock thì cần chạm lại (đừng tự playVideo ngoài gesture)
            if (event?.data === 2 && Date.now() - unlockAtRef.current < 5000) {
              setNeedsTapToPlay(true);
            }
          },
          onError: () => {
            if (!cancelled) setNeedsTapToPlay(true);
          },
        },
      });
    };

    void ensurePlayer();

    return () => {
      cancelled = true;
    };
  }, [audioUnlocked, videoId, isExpanded, frameBox]);

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

  /** Chạm ▶ — phải gọi playVideo trong click handler (user gesture thật) */
  const tapPlayNow = useCallback(() => {
    setNeedsTapToPlay(false);
    unlockAtRef.current = Date.now();
    try {
      const p = ytPlayerRef.current;
      if (!p) {
        setNeedsTapToPlay(true);
        return;
      }
      p.unMute?.();
      p.playVideo?.();
    } catch {
      setNeedsTapToPlay(true);
    }
  }, []);

  const unlockAndPlay = useCallback(() => {
    const wasLocked = !audioUnlocked;
    unlockAtRef.current = Date.now();
    setNeedsTapToPlay(false);

    // Chọn videoId ngay trong click (tránh effect chạy sau khi playlist về → mất gesture)
    let id = normalizeYoutubeId(videoId);
    if (!id) {
      const fromList = playlistRef.current
        .map((s) => normalizeYoutubeId(s.youtube_id))
        .filter(Boolean);
      id = fromList[0] || FALLBACK_VIDEO_ID;
      setVideoId(id);
    }
    wantedVideoRef.current = id;

    flushSync(() => {
      setAudioUnlocked(true);
      if (wasLocked && isMobileDevice()) setIsExpanded(true);
    });
  }, [audioUnlocked, videoId]);

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
        setNeedsTapToPlay(false);
        unlockAtRef.current = Date.now();
        fetchPlaylist();
        window.requestAnimationFrame(() => {
          try {
            ytPlayerRef.current?.loadVideoById?.({ videoId: match[2] });
            ytPlayerRef.current?.unMute?.();
            ytPlayerRef.current?.playVideo?.();
          } catch {
            setNeedsTapToPlay(true);
          }
        });
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
  // Khi mở list bài: hạ z-index video để dropdown không bị iframe YouTube che
  const playerHostStyle =
    isExpanded && frameBox
      ? {
          position: 'fixed',
          top: frameBox.top,
          left: frameBox.left,
          width: frameBox.width,
          height: frameBox.height,
          zIndex: showDropdown ? 90 : 120,
          pointerEvents: showDropdown ? 'none' : 'auto',
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
    <div className="relative bg-black" style={playerHostStyle} aria-hidden={!isExpanded}>
      <div ref={ytMountRef} className="h-full w-full" />
      {audioUnlocked && needsTapToPlay && isExpanded && (
        <button
          type="button"
          onClick={tapPlayNow}
          className="absolute inset-0 z-[130] flex flex-col items-center justify-center gap-2 bg-black/55 text-white"
          style={{ borderRadius: '1rem' }}
        >
          <span className="w-14 h-14 rounded-full bg-white/95 text-[var(--om-primary)] flex items-center justify-center text-2xl shadow-lg">
            ▶
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider">Chạm để phát</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {typeof document !== 'undefined' ? createPortal(player, document.body) : null}

      <div
        className={`fixed inset-x-0 bottom-0 md:inset-x-auto md:bottom-8 md:right-8 flex flex-col items-stretch md:items-end font-sans pointer-events-none px-3 pb-[5.5rem] md:px-0 md:pb-0 ${
          showDropdown && isExpanded ? 'z-[140]' : 'z-[100]'
        }`}
      >
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
          className={`bg-white/95 backdrop-blur-xl shadow-2xl border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] transition-all duration-500 origin-bottom md:origin-bottom-right pointer-events-auto w-full md:w-80 max-h-[min(70vh,34rem)] custom-scrollbar ${
            showDropdown && isExpanded ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
          } ${
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50 px-4 text-center pointer-events-none">
              {audioUnlocked ? (needsTapToPlay ? 'Chạm ▶ trên video' : 'Đang phát…') : 'Chạm nút phát nhạc'}
            </div>
          </div>

          <div className="relative mb-3 md:mb-4 z-30">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="om-field w-full border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] p-3 rounded-2xl flex justify-between items-center text-xs font-bold hover:opacity-90 transition-all"
            >
              <span className="truncate mr-2 text-left text-[var(--om-on-field)]">{currentSongTitle}</span>
              <ChevronDown size={16} className={`shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && isExpanded && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-[50] py-1 custom-scrollbar">
                {playlist.map((song) => (
                  <div
                    key={song.id}
                    className="flex justify-between items-center p-3 bg-white hover:bg-[color-mix(in_srgb,var(--om-primary)_5%,transparent)] cursor-pointer group transition-colors border-b border-gray-50 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const id = normalizeYoutubeId(song.youtube_id);
                        if (!id) return;
                        setVideoId(id);
                        setShowDropdown(false);
                        setNeedsTapToPlay(false);
                        unlockAtRef.current = Date.now();
                        // Phát trong click handler — giữ user gesture
                        window.requestAnimationFrame(() => {
                          try {
                            const p = ytPlayerRef.current;
                            if (p?.loadVideoById) {
                              p.loadVideoById({ videoId: id });
                              p.unMute?.();
                              p.playVideo?.();
                            } else {
                              setNeedsTapToPlay(true);
                            }
                          } catch {
                            setNeedsTapToPlay(true);
                          }
                        });
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

          <div className={`space-y-2 pt-3 border-t border-[color-mix(in_srgb,var(--om-primary-soft)_20%,transparent)] relative ${showDropdown ? 'z-0' : 'z-10'}`}>
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
