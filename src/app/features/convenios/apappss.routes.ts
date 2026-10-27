import { Routes } from '@angular/router';
import { convenioModuleGuard } from './convenio-module.guard';
import { apappssAccessGuard } from './apappss-access.guard';

export const apappssRoutes: Routes = [{
  path: 'convenios/apappss',
  canActivate: [convenioModuleGuard, apappssAccessGuard],
  data: { breadcrumb: 'APAPPSS', moduloEspecial: 'COMERCIALIZACION_ASOCIATIVA' },
  loadComponent: () => import('./adapter/in/ui/pages/apappss-workspace/apappss-workspace').then(m => m.ApappssWorkspacePage),
}];
