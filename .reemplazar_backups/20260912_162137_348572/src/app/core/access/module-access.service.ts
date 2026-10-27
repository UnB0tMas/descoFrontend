import { inject, Injectable } from '@angular/core';

import { AccessStore } from './access.store';

@Injectable({ providedIn: 'root' })
export class ModuleAccessService {
  private readonly store = inject(AccessStore);

  has(code: string): boolean {
    const normalized = code.trim().toUpperCase();

    return this.store
      .modules()
      .some((module) => module.codigo.trim().toUpperCase() === normalized);
  }

  hasRoute(route: string): boolean {
    const normalized = this.normalizeRoute(route);

    return this.store.modules().some((module) => {
      if (!module.ruta) {
        return false;
      }

      return this.normalizeRoute(module.ruta) === normalized;
    });
  }

  private normalizeRoute(route: string): string {
    const trimmed = route.trim();

    if (!trimmed) {
      return '/';
    }

    return (`/${trimmed}`).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}
