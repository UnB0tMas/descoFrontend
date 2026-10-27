import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export type RucNature = 'ANY' | 'NATURAL' | 'JURIDICA';

const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const NATURAL_RUC_PREFIXES = new Set(['10', '15', '17']);

export function notBlankValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;

  if (value === null || value === undefined) {
    return null;
  }

  return String(value).trim().length > 0
    ? null
    : { blank: true };
}

export function dniValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  return /^\d{8}$/.test(value)
    ? null
    : { dni: true };
}

export function rucValidator(
  nature: RucNature = 'ANY',
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    if (!isValidRuc(value)) {
      return { ruc: true };
    }

    const prefix = value.slice(0, 2);

    if (
      nature === 'JURIDICA' &&
      prefix !== '20'
    ) {
      return { rucNature: true };
    }

    if (
      nature === 'NATURAL' &&
      !NATURAL_RUC_PREFIXES.has(prefix)
    ) {
      return { rucNature: true };
    }

    return null;
  };
}

export function notFutureDateValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  return value <= todayLocalIsoDate()
    ? null
    : { futureDate: true };
}

export function dateOrderValidator(
  startControlName: string,
  endControlName: string,
  errorKey = 'dateOrder',
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = String(
      control.get(startControlName)?.value ?? '',
    ).trim();
    const end = String(
      control.get(endControlName)?.value ?? '',
    ).trim();

    if (!start || !end) {
      return null;
    }

    return end >= start
      ? null
      : { [errorKey]: true };
  };
}

export function isValidRuc(value: string): boolean {
  const ruc = value.trim();

  if (!/^\d{11}$/.test(ruc)) {
    return false;
  }

  const sum = RUC_WEIGHTS.reduce(
    (total, weight, index) =>
      total + Number(ruc.charAt(index)) * weight,
    0,
  );

  let checkDigit = 11 - (sum % 11);

  if (checkDigit === 10) {
    checkDigit = 0;
  } else if (checkDigit === 11) {
    checkDigit = 1;
  }

  return checkDigit === Number(ruc.charAt(10));
}

export function sanitizeDocument(
  type: string,
  value: string,
): string {
  const normalizedType = type.trim().toUpperCase();

  if (normalizedType === 'DNI') {
    return value.replace(/\D/g, '').slice(0, 8);
  }

  if (normalizedType === 'RUC') {
    return value.replace(/\D/g, '').slice(0, 11);
  }

  return value
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 30);
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(
  value: string,
): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

export function todayLocalIsoDate(): string {
  const now = new Date();
  const local = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  );

  return local.toISOString().slice(0, 10);
}
