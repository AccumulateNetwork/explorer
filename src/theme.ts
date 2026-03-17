export type ThemePreference = 'light' | 'dark' | 'system';

export function getEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return preference;
}

export function applyTheme(preference: ThemePreference): void {
  const effectiveTheme = getEffectiveTheme(preference);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

export function initTheme(): void {
  // Read theme from localStorage
  const storedTheme = localStorage.getItem('theme');
  let preference: ThemePreference = 'system';

  if (storedTheme) {
    try {
      preference = JSON.parse(storedTheme) as ThemePreference;
    } catch {
      // Use default
    }
  }

  applyTheme(preference);

  // Listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    // Re-read from localStorage in case it changed
    const current = localStorage.getItem('theme');
    let pref: ThemePreference = 'system';
    if (current) {
      try {
        pref = JSON.parse(current) as ThemePreference;
      } catch {
        // Use default
      }
    }
    // Only reapply if using system preference
    if (pref === 'system') {
      applyTheme(pref);
    }
  });
}
