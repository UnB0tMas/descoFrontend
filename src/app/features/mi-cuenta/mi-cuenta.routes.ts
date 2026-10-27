import { Routes } from '@angular/router';

export const miCuentaRoutes: Routes = [
  {
    path: 'mi-cuenta',
    data: { breadcrumb: 'Mi cuenta' },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'perfil',
      },
      {
        path: 'perfil',
        data: { breadcrumb: 'Perfil' },
        loadComponent: () =>
          import('./adapter/in/ui/pages/perfil/perfil').then(
            (m) => m.PerfilPage,
          ),
      },
      {
        path: 'seguridad',
        data: { breadcrumb: 'Seguridad' },
        loadComponent: () =>
          import('./adapter/in/ui/pages/seguridad/seguridad').then(
            (m) => m.SeguridadPage,
          ),
      },
      {
        path: 'sesiones',
        data: { breadcrumb: 'Sesiones' },
        loadComponent: () =>
          import('./adapter/in/ui/pages/sesiones/sesiones').then(
            (m) => m.SesionesPage,
          ),
      },
      {
        path: 'dispositivos',
        data: { breadcrumb: 'Dispositivos' },
        loadComponent: () =>
          import('./adapter/in/ui/pages/dispositivos/dispositivos').then(
            (m) => m.DispositivosPage,
          ),
      },
    ],
  },
];
