import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const almacenesRoutes: Routes = [
  {path:'programacion-productos',data:{breadcrumb:'Programación de productos',module:'ALMACENES',permission:'RECURSOS_LISTAR'},canActivate:[moduleAccessGuard,permissionGuard],loadComponent:()=>import('./adapter/in/ui/pages/programacion-productos/programacion-productos').then(m=>m.ProgramacionProductosPage)},
  {
    path: 'almacenes',
    data: {
      breadcrumb: 'Almacenes y stock',
      module: 'ALMACENES',
      permission: 'ALMACENES_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/almacenes-list/almacenes-list').then(
        (m) => m.AlmacenesListPage,
      ),
  },
  {
    path: 'operaciones-stock',
    data: { breadcrumb: 'Operaciones de stock', module: 'ALMACENES', permission: 'ALMACENES_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/almacen-operations/almacen-operations')
      .then((m) => m.AlmacenOperationsPage),
  },
];
