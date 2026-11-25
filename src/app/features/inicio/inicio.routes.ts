import { Routes } from '@angular/router';

// Inicio siempre está disponible dentro del shell autenticado.
// Los indicadores se consultan únicamente con el permiso correspondiente.
export const inicioRoutes: Routes = [
  {
    path: 'inicio',
    data: { breadcrumb: 'Inicio' },
    loadComponent: () =>
      import('./adapter/in/ui/pages/inicio/inicio').then(
        (m) => m.InicioPage,
      ),
  },
];
