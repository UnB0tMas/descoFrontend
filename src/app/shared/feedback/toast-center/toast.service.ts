import { Injectable, signal } from '@angular/core';

import { ToastInput, ToastMessage } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastSignal = signal<readonly ToastMessage[]>([]);

  readonly toasts = this.toastSignal.asReadonly();

  show(input: ToastInput): string {
    const id = this.createId();

    const toast: ToastMessage = {
      id,
      tone: input.tone ?? 'info',
      title: input.title,
      message: input.message ?? null,
      durationMs: input.durationMs ?? 4500,
      dismissible: input.dismissible ?? true,
    };

    this.toastSignal.update((current) => [...current, toast]);

    if (toast.durationMs > 0) {
      globalThis.setTimeout(() => this.dismiss(id), toast.durationMs);
    }

    return id;
  }

  success(title: string, message?: string): string {
    return this.show({ tone: 'success', title, message });
  }

  info(title: string, message?: string): string {
    return this.show({ tone: 'info', title, message });
  }

  warning(title: string, message?: string): string {
    return this.show({
      tone: 'warning',
      title,
      message,
      durationMs: 6000,
    });
  }

  error(title: string, message?: string): string {
    return this.show({
      tone: 'error',
      title,
      message,
      durationMs: 7000,
    });
  }

  dismiss(id: string): void {
    this.toastSignal.update((current) =>
      current.filter((toast) => toast.id !== id),
    );
  }

  clear(): void {
    this.toastSignal.set([]);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
