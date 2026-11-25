import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const visitasRoutes: Routes = [
  {
    path: 'visitas/mis-salidas/:id',
    data: {breadcrumb: 'Mi actividad', module: 'VISITAS', permission: 'VISITAS_VER'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/mi-actividad/mi-actividad')
      .then(m => m.MiActividadSalidaPage),
  },
  {
    path: 'visitas/registradas',
    data: {breadcrumb: 'Visitas registradas', module: 'VISITAS', permission: 'VISITAS_LISTAR'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/visitas-list/visitas-list')
      .then(m => m.VisitasListPage),
  },
  {
    path: 'visitas',
    data: {breadcrumb: 'Mis salidas técnicas', module: 'VISITAS', permission: 'VISITAS_LISTAR'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/mis-salidas/mis-salidas')
      .then(m => m.MisSalidasTecnicasPage),
  },
  {
    path: 'visitas/:id',
    data: {breadcrumb: 'Detalle de visita', module: 'VISITAS', permission: 'VISITAS_VER'},
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/visita-detail/visita-detail')
      .then(m => m.VisitaDetailPage),
  },
];
