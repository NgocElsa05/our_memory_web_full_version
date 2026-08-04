import { Mail, Mailbox } from 'lucide-react';
import { LOADING_COPY } from '../lib/loadingCopy';

/**
 * CuteLoader — loading / feedback theo LOADING_ANIMATIONS.md
 * variant: 'fullscreen' | 'inline' | 'overlay' | 'toast'
 * motion: 'none' | 'letter' | 'fluff'
 */
export default function CuteLoader({
  message = LOADING_COPY.FS_AUTH,
  variant = 'inline',
  motion = 'none',
  error = false,
  className = '',
}) {
  const textClass = error
    ? 'text-rose-500'
    : variant === 'overlay'
      ? 'text-white'
      : 'text-gray-600';

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {motion === 'letter' && <LetterFlight />}
      {motion === 'fluff' && <FluffFrames />}
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
      <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px] flex items-center justify-center px-6">
        <div className="bg-white/95 rounded-3xl shadow-2xl px-8 py-10 max-w-sm w-full border border-white/60">
          <div className="flex flex-col items-center gap-4">
            {motion === 'fluff' && <FluffFrames />}
            {motion === 'letter' && <LetterFlight />}
            <p className="text-sm font-black text-center text-gray-700 leading-snug max-w-xs">
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

/** AP-01 — 2 cục bông xù + khung tranh */
function FluffFrames() {
  const frames = [
    { t: '8%', l: '6%', r: '-12deg', d: '0s' },
    { t: '0%', l: '38%', r: '8deg', d: '0.35s' },
    { t: '12%', l: '72%', r: '-6deg', d: '0.7s' },
    { t: '58%', l: '4%', r: '10deg', d: '0.2s' },
    { t: '62%', l: '70%', r: '-14deg', d: '0.55s' },
  ];

  return (
    <div className="relative w-44 h-36" aria-hidden>
      {frames.map((f, i) => (
        <span
          key={i}
          className="om-frame-float absolute w-9 h-11 rounded-md border-[3px] border-[var(--om-primary-soft)] bg-[color-mix(in_srgb,var(--om-tint)_70%,white)] shadow-sm"
          style={{
            top: f.t,
            left: f.l,
            ['--om-frame-r']: f.r,
            animationDelay: f.d,
          }}
        >
          <span className="absolute inset-1 rounded-sm bg-[color-mix(in_srgb,var(--om-lavender)_35%,white)]" />
        </span>
      ))}

      <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex items-end -space-x-3">
        <span className="om-fluff om-fluff-a inline-block w-14 h-14 rounded-full bg-[var(--om-primary)] shadow-inner" />
        <span className="om-fluff om-fluff-b inline-block w-12 h-12 rounded-full bg-[var(--om-accent)] shadow-inner relative z-10" />
      </div>
    </div>
  );
}
