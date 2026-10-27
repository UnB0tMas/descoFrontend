import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

type DescoViewTransition = {
  finished: Promise<unknown>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => DescoViewTransition;
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly storageKey = 'desco.ui.theme';
  private static readonly commitClass = 'desco-theme-commit';
  private static readonly overlayClass = 'desco-theme-switch-overlay';

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly themeSignal = signal<AppTheme>(this.initialTheme());
  private readonly switchingSignal = signal(false);

  readonly theme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal() === 'dark');
  readonly switching = this.switchingSignal.asReadonly();

  constructor() {
    this.commit(this.themeSignal(), false);
  }

  set(theme: AppTheme): void {
    if (this.switchingSignal() || theme === this.themeSignal()) {
      return;
    }

    if (!this.browser || this.prefersReducedMotion()) {
      this.commit(theme);
      return;
    }

    this.switchingSignal.set(true);

    const transitionDocument = this.document as ViewTransitionDocument;

    if (typeof transitionDocument.startViewTransition === 'function') {
      this.runViewTransition(transitionDocument, theme);
      return;
    }

    this.runFallbackTransition(theme);
  }

  toggle(): void {
    this.set(this.themeSignal() === 'dark' ? 'light' : 'dark');
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

  private runViewTransition(
    transitionDocument: ViewTransitionDocument,
    theme: AppTheme,
  ): void {
    try {
      const transition = transitionDocument.startViewTransition?.(() => {
        this.commit(theme);
      });

      if (!transition) {
        this.commit(theme);
        this.switchingSignal.set(false);
        return;
      }

      transition.finished
        .catch(() => undefined)
        .finally(() => this.switchingSignal.set(false));
    } catch {
      this.runFallbackTransition(theme);
    }
  }

  private runFallbackTransition(theme: AppTheme): void {
    const overlay = this.document.createElement('div');
    overlay.className = [
      ThemeService.overlayClass,
      `${ThemeService.overlayClass}--${theme}`,
    ].join(' ');
    overlay.setAttribute('aria-hidden', 'true');

    this.document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add(`${ThemeService.overlayClass}--visible`);

      window.setTimeout(() => {
        this.commit(theme);

        requestAnimationFrame(() => {
          overlay.classList.remove(`${ThemeService.overlayClass}--visible`);

          window.setTimeout(() => {
            overlay.remove();
            this.switchingSignal.set(false);
          }, 160);
        });
      }, 110);
    });
  }

  private commit(theme: AppTheme, persist = true): void {
    const html = this.document.documentElement;

    html.classList.add(ThemeService.commitClass);
    html.dataset['theme'] = theme;
    html.classList.toggle('dark', theme === 'dark');
    html.style.colorScheme = theme;
    this.themeSignal.set(theme);

    if (this.browser && persist) {
      localStorage.setItem(ThemeService.storageKey, theme);
    }

    if (this.browser) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          html.classList.remove(ThemeService.commitClass);
        });
      });
    } else {
      html.classList.remove(ThemeService.commitClass);
    }
  }

  private prefersReducedMotion(): boolean {
    return Boolean(
      this.browser &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    );
  }
}
