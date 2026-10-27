import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';
export const gastosRoutes: Routes = [{ path: 'gastos', data: { breadcrumb: 'Gastos', module: 'GASTOS', permission: 'GASTOS_LISTAR' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/gastos-list/gastos-list').then(m => m.GastosListPage) }, { path: 'gastos/:id', data: { breadcrumb: 'Detalle del gasto', module: 'GASTOS', permission: 'GASTOS_VER' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/gasto-detail/gasto-detail').then(m => m.GastoDetailPage) }];
