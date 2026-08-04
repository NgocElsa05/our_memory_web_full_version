import { Heart } from 'lucide-react';
import { useProfileNicknames } from '../hooks/useProfiles';
import CuteLoader from './CuteLoader';
import { LOADING_COPY } from '../lib/loadingCopy';

const SessionUserPicker = ({ onPick }) => {
  const { tabNames: labels, isLoading } = useProfileNicknames();

  return (
    <div className="min-h-screen bg-[var(--om-tint)] flex flex-col items-center justify-center p-6 text-center">
      <Heart className="text-[var(--om-accent)] fill-[var(--om-accent)] mb-4" size={48} />
      <h2 className="text-xl font-black text-gray-800 mb-10 tracking-tight">Hôm nay là ai đây?</h2>

      {isLoading ? (
        <CuteLoader message={LOADING_COPY.AP_NICKNAMES} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          <button
            type="button"
            onClick={() => onPick('user_em')}
            className="p-8 rounded-[32px] bg-white border-2 border-[color-mix(in_srgb,var(--om-accent)_40%,transparent)] shadow-lg shadow-[color-mix(in_srgb,var(--om-accent)_10%,transparent)] hover:border-[var(--om-primary)] hover:shadow-[color-mix(in_srgb,var(--om-primary)_20%,transparent)] active:scale-[0.98] transition-all text-center group"
          >
            <p className="text-lg font-black text-gray-800 group-hover:text-[var(--om-primary)] transition-colors">{labels.user_em}</p>
          </button>
          <button
            type="button"
            onClick={() => onPick('user_anh')}
            className="p-8 rounded-[32px] bg-white border-2 border-[color-mix(in_srgb,var(--om-primary)_30%,transparent)] shadow-lg shadow-[color-mix(in_srgb,var(--om-primary)_10%,transparent)] hover:border-[var(--om-primary)] hover:shadow-xl active:scale-[0.98] transition-all text-center group"
          >
            <p className="text-lg font-black text-gray-800 group-hover:text-[var(--om-primary)] transition-colors">{labels.user_anh}</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionUserPicker;
