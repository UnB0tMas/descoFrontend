import { Injectable, signal } from '@angular/core';

import { ScreenLoadingState } from './screen-loading.model';

@Injectable({ providedIn: 'root' })
export class ScreenLoadingService {
  private readonly stateSignal = signal<ScreenLoadingState>({
    visible: false,
    title: 'Procesando',
    message: null,
  });

  private depth = 0;

  readonly state = this.stateSignal.asReadonly();

  show(
    title = 'Procesando',
    message: string | null = 'Esta operación puede tomar unos segundos.',
  ): void {
    this.depth += 1;

    this.stateSignal.set({
      visible: true,
      title,
      message,
    });
  }

  hide(): void {
    this.depth = Math.max(0, this.depth - 1);

    if (this.depth === 0) {
      this.stateSignal.update((current) => ({
        ...current,
        visible: false,
      }));
    }
  }

  forceHide(): void {
    this.depth = 0;
    this.stateSignal.update((current) => ({
      ...current,
      visible: false,
    }));
  }

  async run<T>(
    task: () => Promise<T>,
    title = 'Procesando',
    message: string | null = 'Esta operación puede tomar unos segundos.',
  ): Promise<T> {
    this.show(title, message);

    try {
      return await task();
    } finally {
      this.hide();
    }
  }
}
