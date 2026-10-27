import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';

export const uotAdminRoutes: Routes = [
  {
    path: 'uot',
    data: {
      breadcrumb: 'Unidades operativas',
      module: 'UOT',
      permission: 'UOT_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/uot-admin/uot-admin').then(
        (m) => m.UotAdminPage,
      ),
  },
];
