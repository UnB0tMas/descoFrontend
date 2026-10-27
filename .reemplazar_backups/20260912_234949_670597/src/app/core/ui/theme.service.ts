import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, effect, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly storageKey = 'desco.ui.theme';
  private static readonly transitionClass = 'desco-theme-transition';
  private static readonly transitionMs = 240;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly themeSignal = signal<AppTheme>(this.initialTheme());

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (!this.browser) {
      return 'light';
    }

    const stored = localStorage.getItem(ThemeService.storageKey);

    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private apply(theme: AppTheme): void {
    const html = this.document.documentElement;
    const current = html.dataset['theme'];
    const shouldAnimate =
      this.browser &&
      (current === 'light' || current === 'dark') &&
      current !== theme &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (shouldAnimate) {
      html.classList.add(ThemeService.transitionClass);
      // La clase debe existir antes de cambiar los tokens del tema.
      void html.offsetWidth;
    }

    html.dataset['theme'] = theme;
    html.classList.toggle('dark', theme === 'dark');
    html.style.colorScheme = theme;

    if (this.browser) {
      localStorage.setItem(ThemeService.storageKey, theme);
    }

    if (shouldAnimate) {
      this.transitionTimer = setTimeout(() => {
        html.classList.remove(ThemeService.transitionClass);
        this.transitionTimer = null;
      }, ThemeService.transitionMs);
    } else {
      html.classList.remove(ThemeService.transitionClass);
    }
  }
}
