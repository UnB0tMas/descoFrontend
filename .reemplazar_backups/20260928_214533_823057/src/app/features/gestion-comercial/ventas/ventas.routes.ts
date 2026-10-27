import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const ventasRoutes: Routes = [
  {
    path: 'ventas',
    data: {
      breadcrumb: 'Ventas',
      module: 'VENTAS',
      permission: 'VENTAS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/ventas-list/ventas-list').then(
        (m) => m.VentasListPage,
      ),
  },
  {
    path: 'ventas/:id',
    data: {
      breadcrumb: 'Detalle de venta',
      module: 'VENTAS',
      permission: 'VENTAS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/venta-detail/venta-detail').then(
        (m) => m.VentaDetailPage,
      ),
  },
];
