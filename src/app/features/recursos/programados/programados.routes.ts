import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';

export const programadosRoutes: Routes = [
  {
    path: 'programados',
    data: { breadcrumb: 'Recursos programados', module: 'RECURSOS', permission: 'RECURSOS_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/recursos-programados-list/recursos-programados-list').then(
        (m) => m.RecursosProgramadosListPage,
      ),
  },
  {
    path: 'programacion-productos',
    data: { breadcrumb: 'Programación de productos', module: 'RECURSOS', permission: 'RECURSOS_LISTAR' },
    canActivate: [moduleAccessGuard, permissionGuard],
    loadComponent: () => import('./adapter/in/ui/pages/programacion-productos/programacion-productos')
      .then((m) => m.ProgramacionProductosPage),
  },
];
