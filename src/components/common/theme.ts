import { Settings } from '../explorer/Settings';
import { useShared } from './Shared';

export type ThemeMode = 'light' | 'dark';

export function useThemeMode(): [ThemeMode, (_: ThemeMode) => void] {
  return useShared(Settings, 'themeMode');
}

export function useEffectiveTheme(): ThemeMode {
  const [mode] = useThemeMode();
  // Tolerate stale 'system' values left over from the previous release.
  return mode === 'dark' ? 'dark' : 'light';
}
