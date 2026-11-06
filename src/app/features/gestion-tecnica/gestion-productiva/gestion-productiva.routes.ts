import { Routes } from '@angular/router';
import { provideExpedienteE1 } from '../predios/expediente/expediente-e1.providers';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

const access = [moduleAccessGuard, permissionGuard];

export const gestionProductivaRoutes: Routes = [{
  path: 'gestion-productiva',
  data: { breadcrumb: 'Gestión productiva' },
  providers: [...provideExpedienteE1()],
  loadComponent: () => import('./gestion-productiva-workspace').then(m => m.GestionProductivaWorkspace),
  children: [
    {
      path: '', pathMatch: 'full',
      data: { module: 'PREDIOS', permission: 'PREDIOS_LISTAR' }, canActivate: access,
      loadComponent: () => import('./gestion-productiva-predios').then(m => m.GestionProductivaPredios),
    },
    {
      path: 'predios/:predioId/parcelas',
      data: { breadcrumb: 'Parcelas', module: 'CULTIVOS', permission: 'CULTIVOS_LISTAR' }, canActivate: access,
      loadComponent: () => import('./gestion-productiva-parcelas').then(m => m.GestionProductivaParcelas),
    },
    {
      path: 'predios/:predioId/parcelas/:parcelaId',
      data: { breadcrumb: 'Seguimiento', module: 'CULTIVOS', permission: 'CULTIVOS_VER' }, canActivate: access,
      loadComponent: () => import('./gestion-productiva-parcela').then(m => m.GestionProductivaParcela),
    },
    {
      path: 'predios/:predioId/parcelas/:parcelaId/actividades/:actividadId/incidencias/:incidenciaId',
      data: { breadcrumb: 'Incidencia', module: 'CULTIVOS', permission: 'CULTIVOS_VER' }, canActivate: access,
      loadComponent: () => import('./gp-incidencia-detalle').then(m => m.GpIncidenciaDetalle),
    },
    {
      path: 'predios/:predioId/parcelas/:parcelaId/actividades/:actividadId',
      data: { breadcrumb: 'Detalle de actividad', module: 'CULTIVOS', permission: 'CULTIVOS_VER' }, canActivate: access,
      loadComponent: () => import('./gestion-productiva-actividad').then(m => m.GestionProductivaActividad),
    },
    // Enlaces históricos, conservados para marcadores y consumidores previos.
    { path: 'predios', pathMatch: 'full', redirectTo: '' },
    { path: 'cultivos', pathMatch: 'full', redirectTo: '' },
    { path: 'censos', pathMatch: 'full', redirectTo: '' },
    { path: 'sanidad', pathMatch: 'full', redirectTo: '' },
    { path: 'evaluaciones', pathMatch: 'full', redirectTo: '' },
  ],
}];
