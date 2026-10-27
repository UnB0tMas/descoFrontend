import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, effect, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly storageKey = 'desco.ui.theme';

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly themeSignal = signal<AppTheme>(this.initialTheme());

  readonly theme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal() === 'dark');

  constructor() {
    effect(() => this.apply(this.themeSignal()));
  }

  set(theme: AppTheme): void {
    this.themeSignal.set(theme);
  }

  toggle(): void {
    this.themeSignal.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private initialTheme(): AppTheme {
    if (!this.browser) return 'light';

    const stored = localStorage.getItem(ThemeService.storageKey);
    if (stored === 'dark' || stored === 'light') return stored;

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private apply(theme: AppTheme): void {
    const html = this.document.documentElement;
    html.dataset['theme'] = theme;
    html.classList.toggle('dark', theme === 'dark');
    html.style.colorScheme = theme;

    if (this.browser) {
      localStorage.setItem(ThemeService.storageKey, theme);
    }
  }
}
