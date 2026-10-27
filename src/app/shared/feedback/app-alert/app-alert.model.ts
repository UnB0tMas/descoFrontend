import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type AppAlertTone =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'question';

export interface AppAlertConfig {
  tone?: AppAlertTone;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  dismissible?: boolean;
  icon?: IconDefinition | null;
}

export interface AppAlertResult {
  confirmed: boolean;
}

export interface AppAlertRequest {
  id: string;
  config: Required<
    Omit<AppAlertConfig, 'icon' | 'cancelLabel'>
  > & {
    icon: IconDefinition | null;
    cancelLabel: string | null;
  };
}
