import { Injectable, signal } from '@angular/core';

import {
  AppAlertConfig,
  AppAlertRequest,
  AppAlertResult,
} from './app-alert.model';

interface PendingAlert {
  request: AppAlertRequest;
  resolve: (result: AppAlertResult) => void;
}

@Injectable({ providedIn: 'root' })
export class AppAlertService {
  private readonly currentSignal = signal<AppAlertRequest | null>(null);
  private readonly queue: PendingAlert[] = [];
  private activeResolver: ((result: AppAlertResult) => void) | null = null;

  readonly current = this.currentSignal.asReadonly();

  open(config: AppAlertConfig): Promise<AppAlertResult> {
    const request: AppAlertRequest = {
      id: this.createId(),
      config: {
        tone: config.tone ?? 'info',
        title: config.title,
        message: config.message,
        confirmLabel: config.confirmLabel ?? 'Aceptar',
        cancelLabel: config.cancelLabel ?? null,
        dismissible: config.dismissible ?? true,
        icon: config.icon ?? null,
      },
    };

    return new Promise<AppAlertResult>((resolve) => {
      this.queue.push({ request, resolve });
      this.pump();
    });
  }

  info(title: string, message: string): Promise<AppAlertResult> {
    return this.open({ tone: 'info', title, message });
  }

  success(title: string, message: string): Promise<AppAlertResult> {
    return this.open({ tone: 'success', title, message });
  }

  warning(title: string, message: string): Promise<AppAlertResult> {
    return this.open({ tone: 'warning', title, message });
  }

  error(title: string, message: string): Promise<AppAlertResult> {
    return this.open({ tone: 'error', title, message });
  }

  question(
    title: string,
    message: string,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
  ): Promise<AppAlertResult> {
    return this.open({
      tone: 'question',
      title,
      message,
      confirmLabel,
      cancelLabel,
    });
  }

  confirm(): void {
    this.finish({ confirmed: true });
  }

  cancel(): void {
    this.finish({ confirmed: false });
  }

  private pump(): void {
    if (this.currentSignal() || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();

    if (!next) {
      return;
    }

    this.activeResolver = next.resolve;
    this.currentSignal.set(next.request);
  }

  private finish(result: AppAlertResult): void {
    const resolver = this.activeResolver;

    this.activeResolver = null;
    this.currentSignal.set(null);

    resolver?.(result);

    queueMicrotask(() => this.pump());
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
