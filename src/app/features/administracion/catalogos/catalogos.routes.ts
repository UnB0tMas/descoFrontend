import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

const catalogAccess = {
  module: 'CATALOGOS',
  permission: 'CATALOGOS_LISTAR',
} as const;

export const catalogosRoutes: Routes = [
  {
    path: 'catalogos',
    data: {
      breadcrumb: 'Catálogos',
      ...catalogAccess,
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/catalogos-list/catalogos-list').then(
        (m) => m.CatalogosListPage,
      ),
  },
  {
    path: 'catalogos-productivos',
    data: {breadcrumb: 'Catálogos productivos', ...catalogAccess},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./catalogos-productivos').then(m => m.CatalogosProductivos),
  },
  {
    path: 'tipos-bien',
    redirectTo: 'catalogos',
    pathMatch: 'full',
  },
];
