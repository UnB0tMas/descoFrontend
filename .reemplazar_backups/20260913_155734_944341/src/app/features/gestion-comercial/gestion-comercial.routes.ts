import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/access/permission.guard';
import { ajustesPrecioRoutes } from './ajustes-precio/ajustes-precio.routes';
import { incidenciasRoutes } from './incidencias/incidencias.routes';

const commercialWorkspace = () =>
  import('./shared/ui/commercial-workspace/commercial-workspace').then(
    (module) => module.CommercialWorkspacePage,
  );

export const gestionComercialRoutes: Routes = [
  {
    path: 'gestion-comercial',
    data: { breadcrumb: 'Gestión comercial' },
    children: [
      {
        path: 'campanias',
        data: { breadcrumb: 'Campañas', workspace: 'campaigns', permission: 'CAMPANIAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'participantes',
        data: { breadcrumb: 'Participantes', workspace: 'participants', permission: 'PARTICIPANTES_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'operativos',
        data: { breadcrumb: 'Operativos', workspace: 'operations', permission: 'OPERATIVOS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'entregas',
        data: { breadcrumb: 'Entregas', workspace: 'deliveries', permission: 'ENTREGAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'jabas',
        data: { breadcrumb: 'Jabas', workspace: 'crates', permission: 'JABAS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'precios',
        data: { breadcrumb: 'Precios', workspace: 'pricing', permission: 'PRECIOS_LISTAR' },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      { path: 'campanas', redirectTo: 'campanias', pathMatch: 'full' },
      { path: 'acopio-entregas', redirectTo: 'entregas', pathMatch: 'full' },
      { path: 'control-jabas', redirectTo: 'jabas', pathMatch: 'full' },
      { path: 'condiciones-precios', redirectTo: 'precios', pathMatch: 'full' },
      { path: 'ajustes-precio', redirectTo: 'ajustes', pathMatch: 'full' },
      ...incidenciasRoutes,
      ...ajustesPrecioRoutes,
    ],
  },
];
