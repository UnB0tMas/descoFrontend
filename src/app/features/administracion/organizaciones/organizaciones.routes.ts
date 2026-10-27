import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const organizacionesRoutes: Routes = [
  {
    path: 'organizaciones',
    data: {
      breadcrumb: 'Empresas, asociaciones y áreas',
      module: 'ORGANIZACIONES',
      permission: 'ORGANIZACIONES_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import(
        './adapter/in/ui/pages/organizaciones-list/organizaciones-list'
      ).then((m) => m.OrganizacionesListPage),
  },
];
