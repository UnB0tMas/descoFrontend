import { Routes } from '@angular/router';

import {
  accesoRoutes,
  authenticatedGuard,
} from './features/acceso/acceso.routes';
import { administracionRoutes } from './features/administracion/administracion.routes';
import { documentosEvidenciasRoutes } from './features/documentos-evidencias/documentos-evidencias.routes';
import { finanzasRoutes } from './features/finanzas/finanzas.routes';
import { gestionComercialRoutes } from './features/gestion-comercial/gestion-comercial.routes';
import { gestionTecnicaRoutes } from './features/gestion-tecnica/gestion-tecnica.routes';
import { inicioRoutes } from './features/inicio/inicio.routes';
import { miCuentaRoutes } from './features/mi-cuenta/mi-cuenta.routes';
import { recursosRoutes } from './features/recursos/recursos.routes';
import { reportesControlRoutes } from './features/reportes-control/reportes-control.routes';
import { uotContextGuard } from './features/uot/uot-context.guard';

export const routes: Routes = [
  ...accesoRoutes,
  {
    path: 'seleccionar-uot',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/uot/adapter/in/ui/pages/uot-selection/uot-selection').then(
        (m) => m.UotSelectionPage,
      ),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./core/pages/forbidden/forbidden').then((m) => m.ForbiddenPage),
  },
  {
    path: 'service-unavailable',
    loadComponent: () =>
      import('./core/pages/service-unavailable/service-unavailable').then(
        (m) => m.ServiceUnavailablePage,
      ),
  },
  {
    path: '',
    canActivate: [authenticatedGuard, uotContextGuard],
    loadComponent: () =>
      import('./shared/layout/app-shell/app-shell').then(
        (m) => m.AppShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: '__contexto-uot',
        loadComponent: () =>
          import('./features/uot/adapter/in/ui/pages/uot-context-refresh/uot-context-refresh').then(
            (m) => m.UotContextRefreshPage,
          ),
      },
      ...inicioRoutes,
      ...miCuentaRoutes,
      ...administracionRoutes,
      ...documentosEvidenciasRoutes,
      ...recursosRoutes,
      ...gestionTecnicaRoutes,
      ...gestionComercialRoutes,
      ...finanzasRoutes,
      ...reportesControlRoutes,
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
