// SENTINEL Appearance & Theme Manager
// Strictly locked to dark mode per operational requirements

export type ThemeMode = 'dark';
export type ResolvedTheme = 'dark';

class ThemeService {
  private mode: ThemeMode = 'dark';
  private listeners: Array<(mode: ThemeMode, resolved: ResolvedTheme) => void> = [];

  constructor() {
    this.applyTheme();
  }

  public getMode(): ThemeMode {
    return 'dark';
  }

  public getResolvedTheme(): ResolvedTheme {
    return 'dark';
  }

  public setMode(_newMode?: any): void {
    this.mode = 'dark';
    this.applyTheme();
  }

  public subscribe(listener: (mode: ThemeMode, resolved: ResolvedTheme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#171B20');
    }

    this.listeners.forEach((listener) => listener('dark', 'dark'));
  }
}

export const themeService = new ThemeService();
