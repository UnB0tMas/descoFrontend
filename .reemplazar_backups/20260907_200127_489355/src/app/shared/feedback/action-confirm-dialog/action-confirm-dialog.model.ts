export type ActionConfirmTone = 'primary' | 'warning' | 'danger';

export interface ActionConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ActionConfirmTone;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minimumReasonLength?: number;
}

export interface ActionConfirmResult {
  confirmed: boolean;
  reason: string | null;
}
