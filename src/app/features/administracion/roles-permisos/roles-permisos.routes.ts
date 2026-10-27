import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const rolesPermisosRoutes: Routes = [
  {
    path: 'roles-permisos',
    data: {
      breadcrumb: 'Roles y permisos',
      module: 'ROLESPERMISOS',
      permission: 'ROLESPERMISOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/roles-list/roles-list').then(
        (m) => m.RolesListPage,
      ),
  },
  {
    path: 'roles-permisos/:id',
    data: {
      breadcrumb: 'Detalle del rol',
      module: 'ROLESPERMISOS',
      permission: 'ROLESPERMISOS_VER',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/rol-detail/rol-detail').then(
        (m) => m.RolDetailPage,
      ),
  },
  {
    path: 'roles-permisos/:id/permisos',
    data: {
      breadcrumb: 'Permisos del rol',
      module: 'ROLESPERMISOS',
      permission: 'ROLESPERMISOS_CREAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/rol-permisos/rol-permisos').then(
        (m) => m.RolPermisosPage,
      ),
  },
];
