import { Routes } from '@angular/router';
import { inventarioVehiculosRoutes } from './inventario-vehiculos/inventario-vehiculos.routes';
import { programadosRoutes } from './programados/programados.routes';

export const recursosRoutes: Routes = [
  {
    path: 'recursos',
    data: { breadcrumb: 'Recursos' },
    children: [
      ...inventarioVehiculosRoutes,
      ...programadosRoutes,
    ],
  },
];
