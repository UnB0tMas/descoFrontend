import { Routes } from '@angular/router';

import { moduleAccessGuard } from '../../core/access/module-access.guard';
import { permissionGuard } from '../../core/access/permission.guard';

export const documentosEvidenciasRoutes: Routes = [
  {
    path: 'documentos-evidencias',
    data: {
      breadcrumb: 'Documentos y evidencias',
      module: 'ARCHIVOS',
      permission: 'ARCHIVOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/documentos-evidencias-list/documentos-evidencias-list').then(
        (m) => m.DocumentosEvidenciasListPage,
      ),
  },
  {
    path: 'documentos-evidencias/locales',
    data: {
      breadcrumb: 'Documentos locales',
      module: 'ARCHIVOS',
      permission: 'ARCHIVOS_LISTAR',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/documentos-locales/documentos-locales').then(
        (m) => m.DocumentosLocalesPage,
      ),
  },
  {
    path: 'documentos-evidencias/:id',
    data: {
      breadcrumb: 'Detalle de evidencia',
      module: 'ARCHIVOS',
      permission: 'ARCHIVOS_VER',
    },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/documento-evidencia-detail/documento-evidencia-detail').then(
        (m) => m.DocumentoEvidenciaDetailPage,
      ),
  },
];
