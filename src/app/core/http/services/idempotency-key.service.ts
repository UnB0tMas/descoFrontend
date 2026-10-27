import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IdempotencyKeyService {
  private readonly pending = new Map<string, string>();

  create(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Reutiliza la misma clave al reintentar exactamente la misma escritura
   * después de un error técnico/transitorio.
   *
   * Si cambia el scope o el payload se genera otra clave. Los errores
   * funcionales 4xx (excepto los transitorios indicados abajo) liberan la
   * clave para que una corrección posterior sea una operación nueva.
   */
  idempotent<T>(
    scope: string,
    payload: unknown,
    request: (key: string) => Observable<T>,
  ): Observable<T> {
    const cacheKey = this.cacheKey(scope, payload);
    const key = this.pending.get(cacheKey) ?? this.store(cacheKey);

    return request(key).pipe(
      tap({
        next: () => this.pending.delete(cacheKey),
        error: (error) => {
          if (!this.shouldReuseAfterError(error)) {
            this.pending.delete(cacheKey);
          }
        },
      }),
    );
  }

  private store(cacheKey: string): string {
    const key = this.create();
    this.pending.set(cacheKey, key);
    return key;
  }

  private cacheKey(scope: string, payload: unknown): string {
    const normalizedScope = scope.trim();
    let serialized = 'null';

    try {
      serialized = JSON.stringify(payload) ?? 'null';
    } catch {
      serialized = String(payload);
    }

    return `${normalizedScope}\n${serialized}`;
  }

  private shouldReuseAfterError(error: unknown): boolean {
    const status = this.httpStatus(error);

    if (status === 409) {
      const code = this.errorCode(error);
      return code === 'OPERACION_EN_PROCESO'
        || code?.startsWith('IDEMPOTENCIA_') === true;
    }

    return status === 0
      || status === 408
      || status === 425
      || status === 429
      || (status != null && status >= 500);
  }

  private errorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return null;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' && code.trim()
      ? code.trim().toUpperCase()
      : null;
  }

  private httpStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object' || !('status' in error)) {
      return null;
    }

    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
}
