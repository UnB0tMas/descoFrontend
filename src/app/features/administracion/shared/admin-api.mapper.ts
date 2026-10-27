import { Injectable } from '@angular/core';

import {
  ApiEnvelope,
  unwrapApiResponse,
} from '../../../infrastructure/openapi/api-response-unwrapper';
import { PageResult } from '../../../shared/models/page-result.model';

type UnknownRecord = Record<string, unknown>;

interface RawPage {
  items?: unknown;
  pagina?: unknown;
  tamanio?: unknown;
  totalRegistros?: unknown;
  totalPaginas?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AdminApiMapper {
  data<T>(response: unknown): T {
    return unwrapApiResponse<T>(response as ApiEnvelope<T>);
  }

  void(response: unknown): void {
    unwrapApiResponse<unknown>(response as ApiEnvelope<unknown>);
  }

  page<T>(
    response: unknown,
    mapper: (row: UnknownRecord) => T,
    fallbackSize = 20,
  ): PageResult<T> {
    const raw = this.record(this.data<unknown>(response)) as RawPage;
    const items = this.array(raw.items).map((item) => mapper(this.record(item)));

    return {
      items,
      page: this.positiveInteger(raw.pagina, 1),
      size: this.positiveInteger(raw.tamanio, fallbackSize),
      totalRecords: this.nonNegativeInteger(raw.totalRegistros),
      totalPages: this.nonNegativeInteger(raw.totalPaginas),
    };
  }

  record(value: unknown): UnknownRecord {
    return value && typeof value === 'object'
      ? (value as UnknownRecord)
      : {};
  }

  array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  string(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }

  nullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  number(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  nullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  boolean(value: unknown): boolean {
    return value === true || value === 1 || value === 'true' || value === '1';
  }

  private positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.trunc(parsed)
      : fallback;
  }

  private nonNegativeInteger(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0
      ? Math.trunc(parsed)
      : 0;
  }
}
