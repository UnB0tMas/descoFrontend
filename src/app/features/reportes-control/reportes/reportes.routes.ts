import { Routes } from '@angular/router';
import { moduleAccessGuard } from '../../../core/access/module-access.guard';
import { permissionGuard } from '../../../core/access/permission.guard';
export const reportesRoutes: Routes = [{ path: 'reportes', data: { breadcrumb: 'Reportes e indicadores', module: 'REPORTES', permission: 'REPORTES_LISTAR' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/reportes-list/reportes-list').then(m => m.ReportesListPage) }, { path: 'reportes/:codigo', data: { breadcrumb: 'Reporte', module: 'REPORTES', permission: 'REPORTES_VER' }, canActivate: [moduleAccessGuard, permissionGuard], loadComponent: () => import('./adapter/in/ui/pages/reporte-detail/reporte-detail').then(m => m.ReporteDetailPage) }];
