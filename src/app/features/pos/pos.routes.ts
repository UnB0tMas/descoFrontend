import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';
import { POS_PROVIDERS } from './pos.providers';

export const posRoutes: Routes = [
  {
    path: 'pos',
    data: {
      breadcrumb: 'Punto de venta',
      posView: 'venta',
      module: 'POS',
      permission: 'POS_OPERAR',
    },
    canActivate: [
      moduleAccessGuard,
      permissionGuard,
    ],
    providers: POS_PROVIDERS,
    loadComponent: () =>
      import('./adapter/in/ui/pages/pos-page/pos-page').then(
        (module) => module.PosPage,
      ),
  },
  {
    path: 'pos/historial',
    data: { breadcrumb: 'Historial de ventas', module: 'HISTORIAL_POS', permission: 'VENTAS_HISTORIAL', posView: 'historial' },
    canActivate: [moduleAccessGuard, permissionGuard],
    providers: POS_PROVIDERS,
    loadComponent: () => import('./adapter/in/ui/pages/pos-page/pos-page').then(module => module.PosPage),
  },
  {
    path: 'pos/personal',
    data: { breadcrumb: 'Gestionar horarios', module: 'PERSONAL_COMERCIAL', permission: 'PERSONAL_COMERCIAL_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/personal-comercial-page/personal-comercial-page').then(m => m.PersonalComercialPage),
  },
  {
    path:'pos/mi-horario',
    data:{breadcrumb:'Mi horario',module:'PERSONAL_COMERCIAL',permission:'PERSONAL_COMERCIAL_PROPIO'},
    canActivate:[moduleAccessGuard,permissionGuard],
    loadComponent:()=>import('./adapter/in/ui/pages/mi-horario-page/mi-horario-page').then(m=>m.MiHorarioPage),
  },
  {
    path: 'pos/mi-caja',
    redirectTo: 'pos/cajas',
  },
  {
    path: 'pos/personal/:id',
    data: { breadcrumb: 'Horario del empleado', module: 'PERSONAL_COMERCIAL', permission: 'PERSONAL_COMERCIAL_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/personal-comercial-detail/personal-comercial-detail').then(m => m.PersonalComercialDetail),
  },
  {
    path: 'pos/cajas/:id',
    data: { breadcrumb: 'Detalle de caja', module: 'CAJAS_POS', permission: 'CAJAS_SUPERVISAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/caja-detail-page/caja-detail-page').then(m => m.CajaDetailPage),
  },
  {
    path: 'pos/cajas',
    data: { breadcrumb: 'Gestión de cajas', module: 'CAJAS_POS', permission: 'CAJAS_ABRIR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/cajas-page/cajas-page').then(module => module.CajasPage),
  },
];
