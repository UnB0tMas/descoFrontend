export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  message: string | null;
  durationMs: number;
  dismissible: boolean;
}

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  message?: string | null;
  durationMs?: number;
  dismissible?: boolean;
}
