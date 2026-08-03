import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[var(--om-tint)] text-gray-800 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] shadow-sm mb-4">
            <Heart className="text-[var(--om-accent)] fill-[var(--om-accent)]" size={28} />
          </div>
          <Link to="/welcome" className="block">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[var(--om-primary)] to-[var(--om-lavender)] bg-clip-text text-transparent uppercase">
              Our Memory
            </h1>
          </Link>
          {title && <h2 className="mt-3 text-lg font-black text-gray-800">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-gray-500 font-medium">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-[color-mix(in_srgb,var(--om-primary-soft)_25%,transparent)] shadow-sm p-6 md:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'om-field w-full rounded-2xl border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--om-primary)] transition-colors';

export const primaryBtnClass =
  'w-full rounded-2xl bg-[var(--om-primary)] text-[var(--om-on-primary)] py-3.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-[color-mix(in_srgb,var(--om-primary)_25%,transparent)] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none';

export const ghostBtnClass =
  'w-full rounded-2xl bg-white border-2 border-[color-mix(in_srgb,var(--om-primary-soft)_40%,transparent)] text-gray-700 py-3.5 text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-50';

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-2xl bg-[color-mix(in_srgb,var(--om-accent)_22%,white)] border border-[color-mix(in_srgb,var(--om-accent)_50%,transparent)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--om-accent)_45%,#3a1a28)]">
      {message}
    </div>
  );
}

export function mapAuthError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('user already')) {
    return 'Email này đã được dùng rồi. Bạn hãy thử đăng nhập nhé.';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'Email hoặc mật khẩu chưa đúng, bạn hãy thử lại nhé.';
  }
  if (msg.includes('password') && (msg.includes('short') || msg.includes('least'))) {
    return 'Mật khẩu cần ít nhất 8 ký tự.';
  }
  if (msg.includes('email not confirmed') || msg.includes('confirm')) {
    return 'Vào hộp thư và bấm link xác nhận giúp mình nha.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Mất mạng rồi. Thử lại giúp nhé.';
  }
  return err?.message || 'Có lỗi xảy ra, thử lại sau giúp nhé.';
}
