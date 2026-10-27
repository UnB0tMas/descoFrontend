import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/access/permission.guard';

export const conveniosAdminRoutes: Routes = [{
  path: 'convenios',
  data: { breadcrumb: 'Convenios y módulos especiales', permission: 'ORGANIZACIONES_LISTAR' },
  canActivate: [permissionGuard],
  loadComponent: () => import('./adapter/in/ui/pages/convenios-admin/convenios-admin').then((m) => m.ConveniosAdminPage),
}];
