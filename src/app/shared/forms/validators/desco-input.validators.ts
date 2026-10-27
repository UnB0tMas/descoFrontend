import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export type RucNature = 'ANY' | 'NATURAL' | 'JURIDICA';

export const MINIMUM_ADULT_AGE = 18;
export const MAX_REASONABLE_PERSON_AGE = 120;

const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;
const NATURAL_RUC_PREFIXES = new Set(['10', '15', '17']);
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ \x27\-][\p{L}\p{M}]+)*$/u;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const PHONE_PATTERN = /^\+?\d{7,15}$/;

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

export function optionalNotBlankValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '');

  if (value.length === 0) {
    return null;
  }

  return value.trim().length > 0
    ? null
    : { blank: true };
}

export function personNameValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  return PERSON_NAME_PATTERN.test(value)
    ? null
    : { personName: true };
}

export function phoneValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  return PHONE_PATTERN.test(value)
    ? null
    : { phone: true };
}

export function usernameValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim().toLowerCase();

  if (!value) {
    return null;
  }

  return USERNAME_PATTERN.test(value)
    ? null
    : { username: true };
}

export function passwordSafetyValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '');

  if (!value) {
    return null;
  }

  if (value !== value.trim()) {
    return { passwordOuterWhitespace: true };
  }

  return /[\r\n\t\u0000-\u001F\u007F]/.test(value)
    ? { passwordControlCharacter: true }
    : null;
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

    if (nature === 'JURIDICA' && prefix !== '20') {
      return { rucNature: true };
    }

    if (
      nature === 'NATURAL'
      && !NATURAL_RUC_PREFIXES.has(prefix)
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

  if (!isValidIsoDate(value)) {
    return { invalidDate: true };
  }

  return value <= todayLocalIsoDate()
    ? null
    : { futureDate: true };
}

export function adultBirthDateValidator(
  minimumAge = MINIMUM_ADULT_AGE,
  maximumAge = MAX_REASONABLE_PERSON_AGE,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    if (!isValidIsoDate(value)) {
      return { invalidDate: true };
    }

    if (value > maxBirthDateIso(minimumAge)) {
      return { underage: true };
    }

    if (value < minBirthDateIso(maximumAge)) {
      return { ageOutOfRange: true };
    }

    return null;
  };
}

export function dateOrderValidator(
  startControlName: string,
  endControlName: string,
  errorKey = 'dateOrder',
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = String(control.get(startControlName)?.value ?? '').trim();
    const end = String(control.get(endControlName)?.value ?? '').trim();

    if (!start || !end) {
      return null;
    }

    return end >= start
      ? null
      : { [errorKey]: true };
  };
}

export function dateAfterMinimumAgeValidator(
  birthControlName: string,
  eventControlName: string,
  minimumAge = MINIMUM_ADULT_AGE,
  errorKey = 'dateBeforeMinimumAge',
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const birth = String(control.get(birthControlName)?.value ?? '').trim();
    const event = String(control.get(eventControlName)?.value ?? '').trim();

    if (!birth || !event || !isValidIsoDate(birth) || !isValidIsoDate(event)) {
      return null;
    }

    const minimumEventDate = addYearsIso(birth, minimumAge);

    return event >= minimumEventDate
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

export function sanitizePersonName(value: string): string {
  return value
    .replace(/[^\p{L}\p{M} \x27\-]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([-\x27])\s*/g, '$1')
    .replace(/^\s+/, '');
}

export function sanitizePhone(value: string): string {
  const raw = String(value ?? '').trim();
  const hasLeadingPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '').slice(0, 15);

  if (!digits) {
    return '';
  }

  return hasLeadingPlus ? `+${digits}` : digits;
}

export function sanitizeUsername(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80);
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
  return isoFromLocalDate(now);
}

export function maxBirthDateIso(
  minimumAge = MINIMUM_ADULT_AGE,
): string {
  return yearsAgoIso(minimumAge);
}

export function minBirthDateIso(
  maximumAge = MAX_REASONABLE_PERSON_AGE,
): string {
  return yearsAgoIso(maximumAge);
}

export function addYearsIsoDate(
  value: string,
  years: number,
): string | null {
  const normalized = String(value ?? '').trim();
  return isValidIsoDate(normalized)
    ? addYearsIso(normalized, years)
    : null;
}

function yearsAgoIso(years: number): string {
  const today = new Date();
  const year = today.getFullYear() - Math.max(0, Math.trunc(years));
  const month = today.getMonth();
  const day = clampDay(year, month, today.getDate());
  return formatIsoDate(year, month + 1, day);
}

function addYearsIso(value: string, years: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const targetYear = year + Math.trunc(years);
  const targetMonthIndex = month - 1;
  const targetDay = clampDay(targetYear, targetMonthIndex, day);
  return formatIsoDate(targetYear, month, targetDay);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= clampDay(year, month - 1, 31);
}

function clampDay(year: number, monthIndex: number, day: number): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, day), lastDay);
}

function isoFromLocalDate(value: Date): string {
  return formatIsoDate(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
  );
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function notFutureDateTimeValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { invalidDateTime: true };
  }

  return parsed.getTime() <= Date.now()
    ? null
    : { futureDateTime: true };
}

export function notPastDateTimeValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { invalidDateTime: true };
  }

  /*
   * Tolerancia de un minuto para evitar rechazar el mismo valor que el
   * formulario acaba de generar por el tiempo transcurrido hasta el submit.
   */
  return parsed.getTime() >= Date.now() - 60_000
    ? null
    : { pastDateTime: true };
}

export function nonNegativeIntegerValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue >= 0
    ? null
    : { nonNegativeInteger: true };
}

export function positiveIntegerValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = control.value;

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? null
    : { positiveInteger: true };
}

export function decimalPrecisionValidator(
  integerDigits: number,
  fractionDigits: number,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const raw = String(value).trim();

    if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
      return { decimalPrecision: true };
    }

    const unsigned = raw.replace(/^-/, '');
    const [integerPart, fractionPart = ''] = unsigned.split('.');

    return integerPart.length <= integerDigits
      && fractionPart.length <= fractionDigits
      ? null
      : { decimalPrecision: true };
  };
}

export function numberOrderValidator(
  lowerControlName: string,
  upperControlName: string,
  errorKey = 'numberOrder',
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const lowerRaw = control.get(lowerControlName)?.value;
    const upperRaw = control.get(upperControlName)?.value;

    if (
      lowerRaw === null
      || lowerRaw === undefined
      || lowerRaw === ''
      || upperRaw === null
      || upperRaw === undefined
      || upperRaw === ''
    ) {
      return null;
    }

    const lower = Number(lowerRaw);
    const upper = Number(upperRaw);

    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      return null;
    }

    return lower <= upper
      ? null
      : { [errorKey]: true };
  };
}

export function localDateTimeInputNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
}
