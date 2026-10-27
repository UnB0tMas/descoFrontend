import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';

export const inicioRoutes: Routes = [
  {
    path: 'inicio',
    data: {
      breadcrumb: 'Dashboard',
      module: 'INICIO',
      permission: 'INICIO_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/inicio/inicio').then(
        (m) => m.InicioPage,
      ),
  },
];
