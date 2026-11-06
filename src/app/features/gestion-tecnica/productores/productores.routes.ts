import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';
import { provideExpedienteE1 } from '../predios/expediente/expediente-e1.providers';

export const productoresRoutes: Routes = [
  {
    path: 'productores',
    data: { breadcrumb: 'Productores tradicionales', module: 'PRODUCTORES', permission: 'PRODUCTORES_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    providers: [...provideExpedienteE1()],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productores-tradicionales/productores-tradicionales').then((m) => m.ProductoresTradicionalesPage),
  },
  {
    path: 'productores/socios',
    data: { breadcrumb: 'Socios APAPPSS', module: 'PRODUCTORES', permission: 'PRODUCTORES_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productores-list/productores-list').then((m) => m.ProductoresListPage),
  },
  {
    path: 'productores/:id',
    data: { breadcrumb: 'Detalle del productor', module: 'PRODUCTORES', permission: 'PRODUCTORES_VER' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/productor-detail/productor-detail').then((m) => m.ProductorDetailPage),
  },
];
