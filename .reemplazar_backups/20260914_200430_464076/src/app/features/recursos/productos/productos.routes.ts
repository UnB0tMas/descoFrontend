import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const productosRoutes: Routes = [
  {
    path: 'productos',
    data: {
      breadcrumb: 'Productos',
      module: 'PRODUCTOS',
      permission: 'PRODUCTOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productos-list/productos-list').then(
        (m) => m.ProductosListPage,
      ),
  },
];
