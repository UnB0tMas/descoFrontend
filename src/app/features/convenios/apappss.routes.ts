import { providePlantasE3 } from './plantas/plantas-e3.providers';
import { provideExpedienteE1 } from '../gestion-tecnica/predios/expediente/expediente-e1.providers';
import { Routes } from '@angular/router';
import { convenioModuleGuard } from './convenio-module.guard';
import { apappssAccessGuard } from './apappss-access.guard';

export const apappssRoutes: Routes = [
  {
    path: 'convenios/apappss',
    canActivate: [convenioModuleGuard, apappssAccessGuard],
    data: { breadcrumb: 'APAPPSS', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    loadComponent: () => import('./adapter/in/ui/pages/apappss-workspace/apappss-workspace')
      .then(m => m.ApappssWorkspacePage),
  },
  {
    path: 'convenios/apappss/socios/:socioId',
    canActivate: [convenioModuleGuard, apappssAccessGuard],
    data: { breadcrumb: 'Detalle del socio', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    providers: [...provideExpedienteE1()],
    loadComponent: () => import('./socios/apappss-socio-detail').then(m => m.ApappssSocioDetailPage),
  },
  {
    path: 'convenios/apappss/predios/:predioId',
    canActivate: [convenioModuleGuard, apappssAccessGuard],
    data: { breadcrumb: 'Expediente del predio', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    providers: [...provideExpedienteE1(), ...providePlantasE3()],
    loadComponent: () => import('./predios/apappss-predio-detail').then(m => m.ApappssPredioDetailPage),
  },
  {
    path: 'convenios/apappss/plantas/:predioId',
    canActivate: [convenioModuleGuard, apappssAccessGuard],
    data: { breadcrumb: 'Plantas de palta', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
    providers: [...provideExpedienteE1(), ...providePlantasE3()],
    loadComponent: () => import('./plantas/adapter/in/ui/plantas-e3').then(m => m.PlantasE3Page),
  },
];
