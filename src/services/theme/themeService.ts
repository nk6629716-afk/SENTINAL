// SENTINEL Appearance & Theme Manager
// Supports 'system' (prefers-color-scheme), 'light', and 'dark' modes
// Persists choice in localStorage and dynamically responds to OS theme changes

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'sentinel_theme_mode';

class ThemeService {
  private mode: ThemeMode = 'system';
  private listeners: Array<(mode: ThemeMode, resolved: ResolvedTheme) => void> = [];
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
        this.mode = saved;
      }
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemChange);
      this.applyTheme();
    }
  }

  private handleSystemChange = () => {
    if (this.mode === 'system') {
      this.applyTheme();
    }
  };

  public getMode(): ThemeMode {
    return this.mode;
  }

  public getResolvedTheme(): ResolvedTheme {
    if (this.mode === 'system') {
      if (typeof window !== 'undefined' && this.mediaQuery) {
        return this.mediaQuery.matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.mode;
  }

  public setMode(newMode: ThemeMode): void {
    this.mode = newMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      this.applyTheme();
    }
  }

  public subscribe(listener: (mode: ThemeMode, resolved: ResolvedTheme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    const resolved = this.getResolvedTheme();
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;

    // Update meta theme-color for mobile address bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolved === 'dark' ? '#171B20' : '#F3F1EB'
      );
    }

    this.listeners.forEach((listener) => listener(this.mode, resolved));
  }
}

export const themeService = new ThemeService();
