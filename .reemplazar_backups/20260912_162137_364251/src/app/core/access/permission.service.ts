import { inject, Injectable } from '@angular/core';

import { AccessStore } from './access.store';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly store = inject(AccessStore);

  has(code: string): boolean {
    const normalized = this.normalize(code);
    return this.store
      .permissions()
      .some((permission) => this.normalize(permission.codigo) === normalized);
  }

  hasAny(codes: readonly string[]): boolean {
    return codes.some((code) => this.has(code));
  }

  hasAll(codes: readonly string[]): boolean {
    return codes.every((code) => this.has(code));
  }

  private normalize(value: string): string {
    return value.trim().toUpperCase();
  }
}
