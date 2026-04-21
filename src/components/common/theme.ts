import { useEffect, useState } from 'react';

import { Settings } from '../explorer/Settings';
import { useShared } from './Shared';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const darkQuery = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(darkQuery).matches
  );
}

export function resolveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function useThemeMode(): [ThemeMode, (_: ThemeMode) => void] {
  return useShared(Settings, 'themeMode');
}

// Returns the theme that should actually be applied, tracking both the user's
// stored preference and (when set to 'system') the OS preference.
export function useEffectiveTheme(): EffectiveTheme {
  const [mode] = useThemeMode();
  const [resolved, setResolved] = useState<EffectiveTheme>(() =>
    resolveTheme(mode),
  );

  useEffect(() => {
    setResolved(resolveTheme(mode));
    if (mode !== 'system' || typeof window === 'undefined') return;

    const mql = window.matchMedia(darkQuery);
    const onChange = () => setResolved(resolveTheme('system'));
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  return resolved;
}
