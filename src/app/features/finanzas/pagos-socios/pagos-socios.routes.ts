import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';
export const pagosSociosRoutes: Routes = [{ path: 'pagos', data: { breadcrumb: 'Pagos a socios', module: 'PAGOS', permission: 'PAGOS_LISTAR' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/pagos-socios-list/pagos-socios-list').then(m => m.PagosSociosListPage) }, { path: 'pagos/:id', data: { breadcrumb: 'Detalle del pago', module: 'PAGOS', permission: 'PAGOS_VER' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/pago-socio-detail/pago-socio-detail').then(m => m.PagoSocioDetailPage) }];
