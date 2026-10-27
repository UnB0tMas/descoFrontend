import { inject, Injectable } from '@angular/core';

import { AccessStore } from './access.store';

@Injectable({ providedIn: 'root' })
export class ModuleAccessService {
  private readonly store = inject(AccessStore);

  has(code: string): boolean {
    const normalized = code.trim().toUpperCase();

    const moduleMatch = this.store.modules().some(
      (module) => module.codigo?.trim().toUpperCase() === normalized,
    );
    if (moduleMatch) return true;

    return this.store.permissions().some(
      (permission) => permission.codigoModulo?.trim().toUpperCase() === normalized,
    );
  }

  hasRoute(route: string): boolean {
    const normalized = this.normalizeRoute(route);
    return this.store.modules().some((module) =>
      module.ruta ? this.normalizeRoute(module.ruta) === normalized : false,
    );
  }

  private normalizeRoute(route: string): string {
    const trimmed = route.trim();
    if (!trimmed) return '/';
    return (`/${trimmed}`).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}
