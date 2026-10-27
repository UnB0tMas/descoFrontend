import { Routes } from '@angular/router';

import { catalogosRoutes } from './catalogos/catalogos.routes';
import { empleadosRoutes } from './empleados/empleados.routes';
import { organizacionesRoutes } from './organizaciones/organizaciones.routes';
import { rolesPermisosRoutes } from './roles-permisos/roles-permisos.routes';
import { usuariosRoutes } from './usuarios/usuarios.routes';

export const administracionRoutes: Routes = [
  {
    path: 'administracion',
    data: {
      breadcrumb: 'Administración',
    },
    children: [
      ...organizacionesRoutes,
      ...rolesPermisosRoutes,
      ...catalogosRoutes,
      ...empleadosRoutes,
      ...usuariosRoutes,
    ],
  },
];
