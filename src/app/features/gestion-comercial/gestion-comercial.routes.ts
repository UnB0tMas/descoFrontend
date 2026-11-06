import { convenioModuleGuard } from '../convenios/convenio-module.guard';
import { Routes } from '@angular/router';
import { provideE4 } from './e4/e4.providers';
import { provideE5 } from './e5/e5.providers';

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
    canActivate: [convenioModuleGuard],
    data: { breadcrumb: 'Comercialización asociativa', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    children: [
      {
        path: 'campanias',
        data: {
          breadcrumb: 'Campañas',
          workspace: 'campaigns',
          permission: 'CAMPANIAS_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'participantes',
        data: {
          breadcrumb: 'Participantes',
          workspace: 'participants',
          permission: 'PARTICIPANTES_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'operativos',
        data: {
          breadcrumb: 'Operativos',
          workspace: 'operations',
          permission: 'OPERATIVOS_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'entregas',
        data: {
          breadcrumb: 'Entregas',
          workspace: 'deliveries',
          permission: 'ENTREGAS_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'jabas',
        data: {
          breadcrumb: 'Jabas',
          workspace: 'crates',
          permission: 'JABAS_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'precios',
        data: {
          breadcrumb: 'Precios',
          workspace: 'pricing',
          permission: 'PRECIOS_LISTAR',
        },
        canActivate: [permissionGuard],
        loadComponent: commercialWorkspace,
      },
      {
        path: 'acopio-rapido',
        data: { breadcrumb: 'Acopio individual APAPPSS', permission: 'JABAS_LISTAR' },
        canActivate: [permissionGuard],
        providers: provideE4(),
        loadComponent: () => import('./e4/adapter/in/ui/e4-page').then(m => m.E4Page),
      },
      {
        path: 'finanzas-apappss',
        data: { breadcrumb: 'Finanzas y liquidaciones APAPPSS', permission: 'LIQUIDACIONES_LISTAR' },
        canActivate: [permissionGuard],
        providers: provideE5(),
        loadComponent: () => import('./e5/adapter/in/ui/e5-page').then(m => m.E5Page),
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
