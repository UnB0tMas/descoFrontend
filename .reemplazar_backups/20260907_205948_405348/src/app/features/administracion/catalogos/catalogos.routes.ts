import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const catalogosRoutes: Routes = [
  {
    path: 'catalogos',
    data: {
      breadcrumb: 'Catálogos',
      module: 'CATALOGOS',
      permission: 'CATALOGOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/catalogos-list/catalogos-list').then(
        (m) => m.CatalogosListPage,
      ),
  },
];
