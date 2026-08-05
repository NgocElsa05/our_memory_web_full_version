import { Mail, Mailbox } from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';

/**
 * CuteLoader — loading / feedback theo LOADING_ANIMATIONS.md
 * variant: 'fullscreen' | 'inline' | 'overlay' | 'toast'
 * motion: 'none' | 'letter' | 'fluff' | 'cards'  (fluff = alias cards)
 */
export default function CuteLoader({
  message = LOADING_COPY.FS_AUTH,
  variant = 'inline',
  motion = 'none',
  error = false,
  className = '',
}) {
  const showCards = motion === 'fluff' || motion === 'cards';
  const textClass = error
    ? 'text-rose-500'
    : variant === 'overlay'
      ? 'text-white'
      : 'text-gray-600';

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {motion === 'letter' && <LetterFlight />}
      {showCards && <MemoryCardsFlight />}
      <p
        className={`text-sm font-black text-center max-w-xs leading-snug ${
          variant === 'fullscreen' || variant === 'overlay'
            ? 'uppercase tracking-widest'
            : 'tracking-wide'
        } ${textClass}`}
      >
        {message}
      </p>
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen om-bg-page flex items-center justify-center px-6">
        {content}
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center px-6">
        <div className="bg-[#fffbf0]/95 rounded-3xl shadow-2xl px-8 py-10 max-w-sm w-full border border-[#e8d9c8]">
          <div className="flex flex-col items-center gap-5">
            {showCards && <MemoryCardsFlight />}
            {motion === 'letter' && <LetterFlight />}
            <p className="text-sm font-black text-center text-[#5c4a3a] leading-snug max-w-xs">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div
        className={`rounded-2xl px-4 py-3 text-sm font-semibold text-center shadow-sm border ${
          error
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-white border-gray-200 text-gray-700'
        } ${className}`}
        role="status"
      >
        {message}
      </div>
    );
  }

  return content;
}

/** MB-01 — lá thư bay vào hộp thư */
function LetterFlight() {
  return (
    <div className="relative w-28 h-16 overflow-visible" aria-hidden>
      <Mailbox
        className="absolute right-0 bottom-0 text-[var(--om-primary)]"
        size={40}
        strokeWidth={1.75}
      />
      <Mail
        className="absolute left-0 top-2 text-[var(--om-accent)] om-letter-fly"
        size={26}
        strokeWidth={1.75}
      />
    </div>
  );
}

/** AP-01 — khung kỷ niệm: thẻ nhỏ bay vào thẻ chính */
function MemoryCardsFlight() {
  const flying = [
    { delay: '0s', opacity: 0.95 },
    { delay: '0.22s', opacity: 0.55 },
    { delay: '0.44s', opacity: 0.32 },
  ];

  return (
    <div className="relative w-40 h-44" aria-hidden>
      {flying.map((f, i) => (
        <span
          key={i}
          className="om-mem-fly absolute left-2 top-2 w-14 h-[4.5rem] rounded-xl border-[3px] border-[#c4a484] bg-[#ddc4a8]/90 shadow-sm"
          style={{
            animationDelay: f.delay,
            opacity: f.opacity,
          }}
        />
      ))}
      <div className="om-mem-main absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[42%] w-[5.25rem] h-[6.75rem] rounded-2xl border-[4px] border-[#b89379] bg-white shadow-md" />
    </div>
  );
}
