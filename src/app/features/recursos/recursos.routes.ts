import { Routes } from '@angular/router';

import { almacenesRoutes } from './almacenes/almacenes.routes';
import { inventarioVehiculosRoutes } from './inventario-vehiculos/inventario-vehiculos.routes';
import { productosRoutes } from './productos/productos.routes';
import { programadosRoutes } from './programados/programados.routes';

export const recursosRoutes: Routes = [
  {
    path: 'recursos',
    data: { breadcrumb: 'Recursos' },
    children: [
      ...inventarioVehiculosRoutes,
      ...productosRoutes,
      ...almacenesRoutes,
      ...programadosRoutes,
    ],
  },
];
