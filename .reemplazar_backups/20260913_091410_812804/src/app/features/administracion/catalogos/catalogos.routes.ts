import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

const catalogAccess = {
  module: 'CATALOGOS',
  permission: 'CATALOGOS_LISTAR',
} as const;

export const catalogosRoutes: Routes = [
  {
    path: 'catalogos',
    data: {
      breadcrumb: 'Catálogos',
      ...catalogAccess,
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/catalogos-list/catalogos-list').then(
        (m) => m.CatalogosListPage,
      ),
  },
  {
    path: 'tipos-bien',
    data: {
      breadcrumb: 'Tipos de bien',
      ...catalogAccess,
      catalogCode: 'TIPO_BIEN',
      pageTitle: 'Tipos de bien',
      pageSubtitle:
        'Administra la clasificación utilizada al registrar bienes de inventario y vehículos.',
      createLabel: 'Nuevo tipo de bien',
      entityLabel: 'Tipo de bien',
      emptyTitle: 'Sin tipos de bien',
      emptyMessage:
        'Todavía no hay tipos de bien registrados. Registra el primero para habilitar su selección en Inventario y vehículos.',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/catalogos-list/catalogos-list').then(
        (m) => m.CatalogosListPage,
      ),
  },
];
