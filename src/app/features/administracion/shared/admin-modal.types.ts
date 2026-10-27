export type AdminModalMode = 'create' | 'edit';

export interface AdminModalResult<T = unknown> {
  saved: boolean;
  value: T | null;
}

export interface AdminSelectOption<T = number> {
  value: T;
  label: string;
  description?: string | null;
  disabled?: boolean;
}
