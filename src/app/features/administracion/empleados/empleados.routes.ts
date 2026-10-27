import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const empleadosRoutes: Routes = [
  {
    path: 'empleados',
    data: {
      breadcrumb: 'Empleados',
      module: 'EMPLEADOS',
      permission: 'EMPLEADOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/empleados-list/empleados-list').then(
        (m) => m.EmpleadosListPage,
      ),
  },
  {
    path: 'empleados/:id',
    data: {
      breadcrumb: 'Detalle del empleado',
      module: 'EMPLEADOS',
      permission: 'EMPLEADOS_VER',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/empleado-detail/empleado-detail').then(
        (m) => m.EmpleadoDetailPage,
      ),
  },
];
