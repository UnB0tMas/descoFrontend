import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const usuariosRoutes: Routes = [
  {
    path: 'usuarios',
    data: {
      breadcrumb: 'Usuarios y accesos',
      module: 'USUARIOS',
      permission: 'USUARIOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/usuarios-list/usuarios-list').then(
        (m) => m.UsuariosListPage,
      ),
  },
  {
    path: 'usuarios/:id',
    data: {
      breadcrumb: 'Detalle del usuario',
      module: 'USUARIOS',
      permission: 'USUARIOS_VER',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/usuario-detail/usuario-detail').then(
        (m) => m.UsuarioDetailPage,
      ),
  },
];
