import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, {
  ErrorBox,
  themedPrimaryBtnClass,
  themedGhostBtnClass,
} from '../../components/auth/AuthLayout';
import { useSpace } from '../../context/SpaceContext';
import { supabase } from '../../supabase';
import { THEME_PALETTES, getThemeCssVars, DEFAULT_THEME_KEY } from '../../lib/themes';
import { LOADING_COPY } from '../../lib/loadingCopy';

export default function ThemePicker() {
  const { space, refresh, markThemeDone } = useSpace();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(space?.theme_key || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Preview trong layout auth — không ghi lên :root để Welcome không bị dính theme
  const previewVars = useMemo(
    () => getThemeCssVars(selected || space?.theme_key || DEFAULT_THEME_KEY),
    [selected, space?.theme_key]
  );

  const save = async (themeKey) => {
    if (!space) {
      setError('Chưa có Space.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: updErr } = await supabase
        .from('spaces')
        .update({ theme_key: themeKey })
        .eq('id', space.id);
      if (updErr) throw updErr;
      markThemeDone(space.id);
      await refresh();
      navigate('/onboarding/profile', { replace: true });
    } catch (err) {
      setError(err.message || 'Không lưu được theme.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Chọn màu chủ đạo"
      subtitle="Có thể đổi lại sau trong cài đặt"
      cssVars={previewVars}
    >
      <ErrorBox message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-h-[50vh] overflow-y-auto pr-1">
        {THEME_PALETTES.map((theme) => {
          const active = selected === theme.key;
          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => setSelected(theme.key)}
              className={`text-left rounded-2xl border-2 p-3 transition-all ${
                active
                  ? 'shadow-sm'
                  : 'border-[color-mix(in_srgb,var(--om-primary-soft)_30%,transparent)] om-surface hover:opacity-90'
              }`}
              style={
                active
                  ? {
                      borderColor: theme.colors[0],
                      background: `color-mix(in srgb, ${theme.colors[0]} 12%, white)`,
                    }
                  : undefined
              }
            >
              <p className="text-xs font-black text-gray-700 mb-2">{theme.name}</p>
              <div className="flex gap-1">
                {theme.colors.map((c) => (
                  <span
                    key={`${theme.key}-${c}`}
                    className="h-7 flex-1 rounded-md border border-black/5"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`${themedPrimaryBtnClass} mb-3`}
        disabled={!selected || loading}
        onClick={() => save(selected)}
      >
        {loading ? LOADING_COPY.AO_THEME : 'Dùng theme này'}
      </button>
      <button type="button" className={themedGhostBtnClass} disabled={loading} onClick={() => save(null)}>
        Chọn sau
      </button>
    </AuthLayout>
  );
}
