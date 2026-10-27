import { computed, inject, Injectable } from '@angular/core';

import { AccessStore } from '../access/access.store';
import { AccessModule } from '../access/models/access-module.model';
import { NavigationItem } from './navigation-item.model';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly accessStore = inject(AccessStore);

  readonly items = computed(() => this.buildTree(this.accessStore.modules()));

  private buildTree(modules: readonly AccessModule[]): readonly NavigationItem[] {
    const moduleById = new Map(
      modules.map((module) => [module.moduloId, module] as const),
    );

    const includedIds = new Set<number>();

    for (const module of modules) {
      if (!module.visibleMenu) {
        continue;
      }

      includedIds.add(module.moduloId);
      let parentId = module.moduloPadreId;

      while (parentId !== null) {
        const parent = moduleById.get(parentId);

        if (!parent || includedIds.has(parent.moduloId)) {
          break;
        }

        includedIds.add(parent.moduloId);
        parentId = parent.moduloPadreId;
      }
    }

    const included = modules.filter((module) =>
      includedIds.has(module.moduloId),
    );

    const byParent = new Map<number | null, AccessModule[]>();

    for (const module of included) {
      const key =
        module.moduloPadreId !== null && includedIds.has(module.moduloPadreId)
          ? module.moduloPadreId
          : null;

      const bucket = byParent.get(key) ?? [];
      bucket.push(module);
      byParent.set(key, bucket);
    }

    const build = (parentId: number | null): NavigationItem[] =>
      (byParent.get(parentId) ?? [])
        .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
        .map((module) => ({
          id: module.moduloId,
          code: module.codigo,
          label: module.nombre,
          route: this.normalizedRoute(module),
          icon: module.icono,
          order: module.orden,
          children: build(module.moduloId),
        }));

    return build(null);
  }

  private normalizedRoute(module: AccessModule): string | null {
    if (!module.visibleMenu) {
      return null;
    }

    if (module.codigo === 'CULTIVOS') {
      return '/gestion-tecnica/parcelas-cultivos';
    }

    if (module.codigo === 'PRODUCCION') {
      return '/gestion-tecnica/produccion';
    }

    return module.ruta;
  }
}
