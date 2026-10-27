import { convenioModuleGuard } from '../../../convenios/convenio-module.guard';
import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const productoresRoutes: Routes = [
  {
    path: 'productores',
    data: { breadcrumb: 'Productores / socios', module: 'PRODUCTORES', permission: 'PRODUCTORES_LISTAR' },
    canActivate: [convenioModuleGuard, moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productores-list/productores-list').then((m) => m.ProductoresListPage),
  },
  {
    path: 'productores/:id',
    data: { breadcrumb: 'Detalle del productor', module: 'PRODUCTORES', permission: 'PRODUCTORES_VER' },
    canActivate: [convenioModuleGuard, moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productor-detail/productor-detail').then((m) => m.ProductorDetailPage),
  },
];
